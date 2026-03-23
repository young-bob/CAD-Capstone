using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.EventTasks;

public static class EventTaskEndpoints
{
    public static void MapEventTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/opportunities/{oppId:guid}/tasks")
            .WithTags("EventTasks")
            .RequireAuthorization();

        // GET all tasks for an event
        group.MapGet("/", async (Guid oppId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, oppId, grains))
                return Results.Forbid();

            var tasks = await db.EventTasks
                .AsNoTracking()
                .Where(t => t.OpportunityId == oppId)
                .OrderBy(t => t.IsCompleted)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Results.Ok(tasks);
        });

        // POST create a task
        group.MapPost("/", async (Guid oppId, CreateEventTaskRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, oppId, grains))
                return Results.Forbid();

            var opp = await grains.GetGrain<IOpportunityGrain>(oppId).GetState();

            var task = new EventTaskEntity
            {
                Id = Guid.NewGuid(),
                OpportunityId = oppId,
                OrganizationId = opp.OrganizationId,
                Title = req.Title,
                Note = req.Note,
                AssignedToGrainId = req.AssignedToGrainId,
                AssignedToEmail = req.AssignedToEmail,
                AssignedToName = req.AssignedToName,
                CreatedByGrainId = req.CreatedByGrainId,
                CreatedByEmail = req.CreatedByEmail,
                CreatedAt = DateTime.UtcNow,
            };

            db.EventTasks.Add(task);
            await db.SaveChangesAsync();
            return Results.Created($"/api/opportunities/{oppId}/tasks/{task.Id}", task);
        });

        // PATCH toggle complete/incomplete
        group.MapPatch("/{taskId:guid}/complete", async (Guid oppId, Guid taskId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, oppId, grains))
                return Results.Forbid();

            var task = await db.EventTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OpportunityId == oppId);
            if (task is null) return Results.NotFound();

            task.IsCompleted = !task.IsCompleted;
            task.CompletedAt = task.IsCompleted ? DateTime.UtcNow : null;
            await db.SaveChangesAsync();
            return Results.Ok(task);
        });

        // DELETE a task
        group.MapDelete("/{taskId:guid}", async (Guid oppId, Guid taskId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, oppId, grains))
                return Results.Forbid();

            var task = await db.EventTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OpportunityId == oppId);
            if (task is null) return Results.NotFound();

            db.EventTasks.Remove(task);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
