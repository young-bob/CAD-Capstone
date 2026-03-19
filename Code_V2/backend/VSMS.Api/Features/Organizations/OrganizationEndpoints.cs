using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Organizations;

public static class OrganizationEndpoints
{
    public static void MapOrganizationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/organizations").WithTags("Organizations").RequireAuthorization();

        group.MapPost("/", async (CreateOrgRequest req, HttpContext http, IGrainFactory grains, AppDbContext db) =>
        {
            if (!http.IsCoordinator() && !http.IsSystemAdmin())
                return Results.Forbid();

            Guid creatorUserId;
            string creatorEmail;
            if (http.IsSystemAdmin())
            {
                creatorUserId = req.CreatorUserId;
                creatorEmail = await db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == creatorUserId && u.Role == "Coordinator")
                    .Select(u => u.Email)
                    .FirstOrDefaultAsync() ?? string.Empty;
                if (creatorUserId == Guid.Empty || string.IsNullOrWhiteSpace(creatorEmail))
                    return Results.BadRequest(new { Error = "A valid coordinator creatorUserId is required." });
            }
            else
            {
                if (!http.TryGetUserId(out creatorUserId))
                    return Results.Unauthorized();
                creatorEmail = await db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == creatorUserId)
                    .Select(u => u.Email)
                    .FirstOrDefaultAsync() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(creatorEmail))
                    return Results.BadRequest(new { Error = "Creator user profile not found." });
            }

            // Use the coordinator's grain ID as the org ID so mobile linkedGrainId matches
            // Look up the coordinator to get their grain ID
            var coordinator = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == creatorUserId);
            if (coordinator == null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });
            if (coordinator.OrganizationId.HasValue && coordinator.OrganizationId.Value != Guid.Empty)
                return Results.Conflict(new { Error = "Coordinator already belongs to an organization." });

            var orgId = coordinator.GrainId;

            // Create the organization grain using the coordinator's grain ID
            var orgGrain = grains.GetGrain<IOrganizationGrain>(orgId);
            await orgGrain.Initialize(req.Name, req.Description, creatorUserId, creatorEmail, req.ProofUrl);

            // Link the coordinator grain to this organization
            var coordGrain = grains.GetGrain<ICoordinatorGrain>(orgId);
            await coordGrain.SetOrganization(orgId);

            // Update the read-side coordinator entity
            coordinator.OrganizationId = orgId;
            await db.SaveChangesAsync();

            return Results.Created($"/api/organizations/{orgId}", new { OrgId = orgId });
        });

        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/pending", async (int? skip, int? take, IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync(skip ?? 0, take ?? 500)));

        group.MapGet("/approved", async (int? skip, int? take, IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetApprovedOrganizationsAsync(skip ?? 0, take ?? 500)));

        group.MapGet("/", async (OrgStatus? status, int? skip, int? take, IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetAllOrganizationsAsync(status, skip ?? 0, take ?? 500)))
            .RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        group.MapPut("/{id:guid}", async (Guid id, UpdateOrgRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.UpdateInfo(req.Name, req.Description);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/resubmit", async (Guid id, ResubmitOrgRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.Resubmit(req.Name, req.Description, req.ProofUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/opportunities", async (Guid id, CreateOppRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            var oppId = await grain.CreateOpportunity(req.Title, req.Description, req.Category);
            return Results.Created($"/api/opportunities/{oppId}", new { OpportunityId = oppId });
        });

        group.MapPost("/{id:guid}/members", async (Guid id, InviteMemberRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.InviteMember(req.Email, req.Role);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/block/{volunteerId:guid}", async (Guid id, Guid volunteerId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.BlockVolunteer(volunteerId);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}/block/{volunteerId:guid}", async (Guid id, Guid volunteerId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.UnblockVolunteer(volunteerId);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/opportunities", async (Guid id, int? skip, int? take, HttpContext http, AppDbContext db, IOpportunityQueryService queryService) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByOrganizationAsync(id, skip ?? 0, take ?? 500));
        });

        group.MapGet("/{id:guid}/applications", async (Guid id, int? skip, int? take, HttpContext http, AppDbContext db, IApplicationQueryService queryService) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByOrganizationAsync(id, skip ?? 0, take ?? 500));
        });
    }

}

public record UpdateOrgRequest(string Name, string Description);
