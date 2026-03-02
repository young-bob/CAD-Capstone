using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Middleware;

/// <summary>
/// Middleware that checks if the authenticated user is banned.
/// If banned, the request is immediately rejected with 403 Forbidden.
/// This runs AFTER authentication so ClaimsPrincipal is available.
/// </summary>
public class BanCheckMiddleware(RequestDelegate next)
{
    // In-memory cache to avoid hitting the DB on every single request.
    // Key: userId, Value: (isBanned, cachedAt)
    private static readonly Dictionary<Guid, (bool IsBanned, DateTime CachedAt)> _cache = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
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

        // Check cache first
        if (_cache.TryGetValue(userId, out var cached) && DateTime.UtcNow - cached.CachedAt < CacheDuration)
        {
            if (cached.IsBanned)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { error = "Your account has been suspended." });
                return;
            }

            await next(context);
            return;
        }

        // Query DB for ban status
        var isBanned = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.IsBanned)
            .FirstOrDefaultAsync();

        // Update cache
        _cache[userId] = (isBanned, DateTime.UtcNow);

        if (isBanned)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Your account has been suspended." });
            return;
        }

        await next(context);
    }

    /// <summary>
    /// Call this when a user is banned or unbanned to immediately invalidate the cache entry.
    /// </summary>
    public static void InvalidateCache(Guid userId)
    {
        _cache.Remove(userId);
    }
}
