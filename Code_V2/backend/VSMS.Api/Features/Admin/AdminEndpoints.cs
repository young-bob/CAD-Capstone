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

        // List all users excluding SystemAdmin (with optional filter by role or email search)
        group.MapGet("/users", async (string? role, string? search, AppDbContext db) =>
        {
            var q = db.Users.Where(u => u.Role != "SystemAdmin").AsQueryable();
            if (!string.IsNullOrWhiteSpace(role))
                q = q.Where(u => u.Role == role);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(u => u.Email.Contains(search));
            var users = await q
                .OrderBy(u => u.CreatedAt)
                .Select(u => new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt })
                .ToListAsync();

            // Enrich coordinators with org info from read-side tables
            var coordUserIds = users.Where(u => u.Role == "Coordinator").Select(u => u.Id).ToList();
            var coordOrgs = new Dictionary<Guid, (string OrgId, string OrgName)>();
            if (coordUserIds.Count > 0)
            {
                var entries = await db.Coordinators
                    .Where(c => coordUserIds.Contains(c.UserId) && c.OrganizationId != Guid.Empty)
                    .Join(db.OrganizationReadModels,
                        c => c.OrganizationId,
                        o => o.OrgId,
                        (c, o) => new { c.UserId, OrgId = o.OrgId.ToString(), OrgName = o.Name })
                    .ToListAsync();
                foreach (var e in entries)
                    coordOrgs[e.UserId] = (e.OrgId, e.OrgName);
            }

            var result = users.Select(u =>
            {
                if (u.Role == "Coordinator" && coordOrgs.TryGetValue(u.Id, out var org))
                    return (object)new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt, organizationId = (string?)org.OrgId, organizationName = (string?)org.OrgName };
                return (object)new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt, organizationId = (string?)null, organizationName = (string?)null };
            });

            return Results.Ok(result);
        });

        // Reassign primary coordinator for an organization (updates read-side DB only)
        group.MapPost("/organizations/{orgId:guid}/reassign-coordinator", async (Guid orgId, ReassignCoordinatorRequest req, AppDbContext db) =>
        {
            var newCoord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == req.CoordinatorUserId);
            if (newCoord is null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });

            // Clear existing primary coordinator for this org
            var oldCoords = await db.Coordinators.Where(c => c.OrganizationId == orgId).ToListAsync();
            foreach (var old in oldCoords)
                old.OrganizationId = Guid.Empty;

            // Assign new coordinator
            newCoord.OrganizationId = orgId;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Reset a user's password (cannot reset another SystemAdmin)
        group.MapPost("/users/{userId:guid}/reset-password", async (Guid userId, ResetPasswordRequest req, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
                return Results.BadRequest(new { Error = "Password must be at least 6 characters." });
            var user = await db.Users.FindAsync(userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot reset SystemAdmin password via this endpoint." });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Convenience: list pending organizations
        group.MapGet("/pending-organizations", async (IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync()));
    }

}
