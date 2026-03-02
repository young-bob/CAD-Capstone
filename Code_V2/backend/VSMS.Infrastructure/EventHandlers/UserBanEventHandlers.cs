using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Infrastructure.EventHandlers;

/// <summary>
/// Handles UserBannedEvent / UserUnbannedEvent by updating the IsBanned flag
/// on the UserEntity in the database. This allows BanCheckMiddleware to enforce bans.
/// The event carries the GrainId from the AdminGrain — we resolve the UserEntity
/// by looking up the matching child entity (Volunteer, Coordinator or Admin).
/// </summary>
public class UserBanEventHandlers(
    IServiceProvider sp,
    ILogger<UserBanEventHandlers> logger)
    : IEventHandler<UserBannedEvent>, IEventHandler<UserUnbannedEvent>
{
    public async Task HandleAsync(UserBannedEvent domainEvent)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userId = await ResolveUserIdAsync(db, domainEvent.UserId);
        if (userId is null)
        {
            logger.LogWarning("BanUser: No user found for GrainId {GrainId}", domainEvent.UserId);
            return;
        }

        var user = await db.Users.FindAsync(userId.Value);
        if (user is not null)
        {
            user.IsBanned = true;
            await db.SaveChangesAsync();
            logger.LogWarning("User {UserId} marked as BANNED in database", userId.Value);
        }
    }

    public async Task HandleAsync(UserUnbannedEvent domainEvent)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userId = await ResolveUserIdAsync(db, domainEvent.UserId);
        if (userId is null)
        {
            logger.LogWarning("UnbanUser: No user found for GrainId {GrainId}", domainEvent.UserId);
            return;
        }

        var user = await db.Users.FindAsync(userId.Value);
        if (user is not null)
        {
            user.IsBanned = false;
            await db.SaveChangesAsync();
            logger.LogInformation("User {UserId} UNBANNED in database", userId.Value);
        }
    }

    /// <summary>
    /// Resolves a UserEntity.Id from a GrainId by searching child entities.
    /// </summary>
    private static async Task<Guid?> ResolveUserIdAsync(AppDbContext db, Guid grainId)
    {
        var vol = await db.Volunteers.FirstOrDefaultAsync(v => v.GrainId == grainId);
        if (vol is not null) return vol.UserId;

        var coord = await db.Coordinators.FirstOrDefaultAsync(c => c.GrainId == grainId);
        if (coord is not null) return coord.UserId;

        var admin = await db.Admins.FirstOrDefaultAsync(a => a.GrainId == grainId);
        if (admin is not null) return admin.UserId;

        // Fallback: treat the grainId as the direct UserId (SystemAdmin seeded without child)
        return grainId;
    }
}

