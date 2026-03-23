using Microsoft.EntityFrameworkCore;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Notifications;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications").WithTags("Notifications").RequireAuthorization();

        // GET /api/notifications — returns the current volunteer's notifications, newest first
        group.MapGet("/", async (HttpContext http, AppDbContext db, int? limit) =>
        {
            if (!http.TryGetGrainId(out var grainId))
                return Results.Forbid();

            var take = Math.Min(limit ?? 50, 100);
            var items = await db.Notifications
                .AsNoTracking()
                .Where(n => n.VolunteerGrainId == grainId)
                .OrderByDescending(n => n.SentAt)
                .Take(take)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.SenderName,
                    n.SentAt,
                    n.IsRead,
                })
                .ToListAsync();

            return Results.Ok(items);
        });

        // GET /api/notifications/unread-count
        group.MapGet("/unread-count", async (HttpContext http, AppDbContext db) =>
        {
            if (!http.TryGetGrainId(out var grainId))
                return Results.Forbid();

            var count = await db.Notifications
                .AsNoTracking()
                .CountAsync(n => n.VolunteerGrainId == grainId && !n.IsRead);

            return Results.Ok(new { count });
        });

        // POST /api/notifications/{id}/read
        group.MapPost("/{id:guid}/read", async (Guid id, HttpContext http, AppDbContext db) =>
        {
            if (!http.TryGetGrainId(out var grainId))
                return Results.Forbid();

            var notification = await db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.VolunteerGrainId == grainId);

            if (notification is null) return Results.NotFound();

            notification.IsRead = true;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST /api/notifications/read-all
        group.MapPost("/read-all", async (HttpContext http, AppDbContext db) =>
        {
            if (!http.TryGetGrainId(out var grainId))
                return Results.Forbid();

            await db.Notifications
                .Where(n => n.VolunteerGrainId == grainId && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

            return Results.NoContent();
        });
    }
}
