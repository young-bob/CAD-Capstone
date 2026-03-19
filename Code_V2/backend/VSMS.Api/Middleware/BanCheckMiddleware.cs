using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Middleware;

/// <summary>
/// Middleware that checks if the authenticated user is banned.
/// If banned, the request is immediately rejected with 403 Forbidden.
/// This runs AFTER authentication so ClaimsPrincipal is available.
/// </summary>
public class BanCheckMiddleware(RequestDelegate next)
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);
    private static string CacheKey(Guid userId) => $"ban:{userId}";

    public async Task InvokeAsync(HttpContext context, AppDbContext db, IMemoryCache cache)
    {
        // Skip for unauthenticated requests (login, register, etc.)
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            await next(context);
            return;
        }

        var isBanned = await cache.GetOrCreateAsync(CacheKey(userId), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.IsBanned)
                .FirstOrDefaultAsync();
        });

        if (isBanned)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Your account has been suspended." });
            return;
        }

        await next(context);
    }

}
