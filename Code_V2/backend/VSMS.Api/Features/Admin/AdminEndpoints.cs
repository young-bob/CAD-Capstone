using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Admin;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin").WithTags("Admin")
            .RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        group.MapPost("/organizations/{orgId:guid}/approve", async (Guid orgId, IGrainFactory grains) =>
        {
            // Use a singleton admin grain for simplicity
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.ApproveOrganization(orgId);
            return Results.NoContent();
        });

        group.MapPost("/organizations/{orgId:guid}/reject", async (Guid orgId, RejectOrgRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.RejectOrganization(orgId, req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/users/{userId:guid}/ban", async (Guid userId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.BanUser(userId);
            return Results.NoContent();
        });

        group.MapPost("/users/{userId:guid}/unban", async (Guid userId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.UnbanUser(userId);
            return Results.NoContent();
        });

        group.MapPost("/disputes/{attendanceId:guid}/resolve", async (Guid attendanceId, ResolveDisputeRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.ResolveDispute(attendanceId, req.Resolution, req.AdjustedHours);
            return Results.NoContent();
        });

        // List all users (with optional filter by role or email search)
        group.MapGet("/users", async (string? role, string? search, AppDbContext db) =>
        {
            var q = db.Users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(role))
                q = q.Where(u => u.Role == role);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(u => u.Email.Contains(search));
            var users = await q
                .OrderBy(u => u.Email)
                .Select(u => new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt })
                .ToListAsync();
            return Results.Ok(users);
        });

        // Convenience: list pending organizations
        group.MapGet("/pending-organizations", async (IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync()));
    }

}
