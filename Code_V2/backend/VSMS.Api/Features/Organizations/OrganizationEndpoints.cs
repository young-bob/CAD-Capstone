using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Organizations;

public static class OrganizationEndpoints
{
    public static void MapOrganizationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/organizations").WithTags("Organizations").RequireAuthorization();

        group.MapPost("/", async (CreateOrgRequest req, IGrainFactory grains, AppDbContext db) =>
        {
            // Use the coordinator's grain ID as the org ID so mobile linkedGrainId matches
            // Look up the coordinator to get their grain ID
            var coordinator = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == req.CreatorUserId);
            if (coordinator == null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });

            var orgId = coordinator.GrainId;

            // Create the organization grain using the coordinator's grain ID
            var orgGrain = grains.GetGrain<IOrganizationGrain>(orgId);
            await orgGrain.Initialize(req.Name, req.Description, req.CreatorUserId, req.CreatorEmail);

            // Link the coordinator grain to this organization
            var coordGrain = grains.GetGrain<ICoordinatorGrain>(orgId);
            await coordGrain.SetOrganization(orgId);

            // Update the read-side coordinator entity
            coordinator.OrganizationId = orgId;
            await db.SaveChangesAsync();

            return Results.Created($"/api/organizations/{orgId}", new { OrgId = orgId });
        });

        group.MapGet("/{id:guid}", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/pending", async (IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync()));

        group.MapGet("/approved", async (IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetApprovedOrganizationsAsync()));

        group.MapPut("/{id:guid}", async (Guid id, UpdateOrgRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.UpdateInfo(req.Name, req.Description);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/opportunities", async (Guid id, CreateOppRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            var oppId = await grain.CreateOpportunity(req.Title, req.Description, req.Category);
            return Results.Created($"/api/opportunities/{oppId}", new { OpportunityId = oppId });
        });

        group.MapPost("/{id:guid}/members", async (Guid id, InviteMemberRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.InviteMember(req.Email, req.Role);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/block/{volunteerId:guid}", async (Guid id, Guid volunteerId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.BlockVolunteer(volunteerId);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}/block/{volunteerId:guid}", async (Guid id, Guid volunteerId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOrganizationGrain>(id);
            await grain.UnblockVolunteer(volunteerId);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/opportunities", async (Guid id, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.GetByOrganizationAsync(id));
        });

        group.MapGet("/{id:guid}/applications", async (Guid id, IApplicationQueryService queryService) =>
        {
            return Results.Ok(await queryService.GetByOrganizationAsync(id));
        });
    }

}

public record UpdateOrgRequest(string Name, string Description);
