using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Admin;

public static class AdminEndpoints
{
    private static (int Skip, int Take) NormalizePaging(int skip, int take)
    {
        if (skip < 0) skip = 0;
        if (take <= 0) take = 500;
        if (take > 500) take = 500;
        return (skip, take);
    }

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

        group.MapPost("/users/{userId:guid}/ban", async (Guid userId, HttpContext http, IGrainFactory grains) =>
        {
            var callerId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? http.User.FindFirst("sub")?.Value;
            if (callerId != null && Guid.TryParse(callerId, out var callerGuid) && callerGuid == userId)
                return Results.BadRequest(new { Error = "You cannot ban yourself." });

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
        group.MapGet("/users", async (string? role, string? search, string? status, DateTime? dateFrom, DateTime? dateTo, string? sort, int skip, int take, AppDbContext db) =>
        {
            var (safeSkip, safeTake) = NormalizePaging(skip, take);
            var q = db.Users.AsNoTracking().Where(u => u.Role != "SystemAdmin").AsQueryable();
            if (!string.IsNullOrWhiteSpace(role))
                q = q.Where(u => u.Role == role);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(u => u.Email.Contains(search));
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (status.Equals("active", StringComparison.OrdinalIgnoreCase)) q = q.Where(u => !u.IsBanned);
                if (status.Equals("banned", StringComparison.OrdinalIgnoreCase)) q = q.Where(u => u.IsBanned);
            }
            if (dateFrom.HasValue)
                q = q.Where(u => u.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue)
                q = q.Where(u => u.CreatedAt <= dateTo.Value);

            q = sort?.ToLowerInvariant() switch
            {
                "oldest" => q.OrderBy(u => u.CreatedAt),
                "email_asc" => q.OrderBy(u => u.Email),
                "email_desc" => q.OrderByDescending(u => u.Email),
                _ => q.OrderByDescending(u => u.CreatedAt),
            };

            var users = await q
                .Skip(safeSkip)
                .Take(safeTake)
                .Select(u => new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt })
                .ToListAsync();

            // Enrich coordinators with org info from read-side tables
            var coordUserIds = users.Where(u => u.Role == "Coordinator").Select(u => u.Id).ToList();
            var coordOrgs = new Dictionary<Guid, (string OrgId, string OrgName)>();
            if (coordUserIds.Count > 0)
            {
                var entries = await db.Coordinators
                    .AsNoTracking()
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
        group.MapGet("/pending-organizations", async (int skip, int take, IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync(skip, take)));

        // Delete a user (cannot delete SystemAdmin or self; requires email confirmation)
        group.MapDelete("/users/{userId:guid}", async (Guid userId, [FromBody] DeleteUserRequest req, HttpContext http, AppDbContext db) =>
        {
            var callerId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? http.User.FindFirst("sub")?.Value;
            if (callerId != null && Guid.TryParse(callerId, out var callerGuid) && callerGuid == userId)
                return Results.BadRequest(new { Error = "You cannot delete yourself." });

            var user = await db.Users
                .Include(u => u.VolunteerProfile)
                .Include(u => u.CoordinatorProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot delete a SystemAdmin." });
            if (!string.Equals(user.Email, req.ConfirmEmail, StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { Error = "Email confirmation does not match." });

            if (user.VolunteerProfile != null) db.Volunteers.Remove(user.VolunteerProfile);
            if (user.CoordinatorProfile != null) db.Coordinators.Remove(user.CoordinatorProfile);
            db.Users.Remove(user);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Change a user's role to Volunteer or Coordinator
        group.MapPost("/users/{userId:guid}/change-role", async (Guid userId, ChangeRoleRequest req, AppDbContext db) =>
        {
            if (req.NewRole != "Volunteer" && req.NewRole != "Coordinator")
                return Results.BadRequest(new { Error = "Role must be 'Volunteer' or 'Coordinator'." });

            var user = await db.Users
                .Include(u => u.VolunteerProfile)
                .Include(u => u.CoordinatorProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot change SystemAdmin role." });
            if (user.Role == req.NewRole) return Results.NoContent();

            user.Role = req.NewRole;
            if (req.NewRole == "Coordinator" && user.CoordinatorProfile is null)
                db.Coordinators.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.CoordinatorEntity { UserId = userId, GrainId = Guid.NewGuid() });
            else if (req.NewRole == "Volunteer" && user.VolunteerProfile is null)
                db.Volunteers.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.VolunteerEntity { UserId = userId, GrainId = Guid.NewGuid() });

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Add a coordinator to an org directly (does not clear existing coordinator)
        group.MapPost("/organizations/{orgId:guid}/add-coordinator", async (Guid orgId, ReassignCoordinatorRequest req, AppDbContext db) =>
        {
            var coord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == req.CoordinatorUserId);
            if (coord is null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });
            coord.OrganizationId = orgId;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

}
