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

        group.MapPost("/{id:guid}/members", async (Guid id, InviteMemberRequest req, HttpContext http, AppDbContext db, IGrainFactory grains, IEmailService emailService) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();

            // Look up the coordinator by email — only coordinators can be added as members
            var coordinator = await db.Coordinators
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.User.Email == req.Email && c.User.Role == "Coordinator");

            if (coordinator == null)
                return Results.NotFound(new { Error = "No coordinator account found with that email address." });

            if (coordinator.OrganizationId.HasValue && coordinator.OrganizationId.Value != Guid.Empty)
                return Results.Conflict(new { Error = "This coordinator already belongs to an organization." });

            // Link in DB so CanManageOrganizationAsync passes for this user
            coordinator.OrganizationId = id;
            await db.SaveChangesAsync();

            // Update grain state with proper UserId
            var orgGrain = grains.GetGrain<IOrganizationGrain>(id);
            await orgGrain.AddCoordinator(coordinator.UserId, coordinator.User.Email);

            // Link the coordinator's own grain to this org
            var coordGrain = grains.GetGrain<ICoordinatorGrain>(coordinator.GrainId);
            await coordGrain.SetOrganization(id);

            // Notify the added coordinator by email
            var orgState = await orgGrain.GetState();
            await emailService.SendAsync(
                coordinator.User.Email,
                $"You've been added to {orgState.Name} on VSMS",
                $"<p>Hi,</p><p>You have been added as a coordinator of <strong>{orgState.Name}</strong> on VSMS. You can now manage events, applications, and volunteers for this organization.</p><p>Log in to your coordinator dashboard to get started.</p>");

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

        // ── Event Templates ──────────────────────────────────────────────────

        group.MapGet("/{id:guid}/event-templates", async (Guid id, HttpContext http, AppDbContext db) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var templates = await db.EventTemplates
                .AsNoTracking()
                .Where(t => t.OrganizationId == id)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id, t.Name, t.Title, t.Description, t.Category,
                    t.TagsJson, t.ApprovalPolicy, t.RequiredSkillIdsJson,
                    t.Latitude, t.Longitude, t.RadiusMeters, t.CreatedAt
                })
                .ToListAsync();
            return Results.Ok(templates);
        });

        group.MapPost("/{id:guid}/event-templates", async (Guid id, SaveEventTemplateRequest req, HttpContext http, AppDbContext db) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { Error = "Template name is required." });
            var entity = new VSMS.Infrastructure.Data.EfCoreQuery.Entities.EventTemplateEntity
            {
                OrganizationId = id,
                Name = req.Name.Trim(),
                Title = req.Title?.Trim() ?? string.Empty,
                Description = req.Description?.Trim() ?? string.Empty,
                Category = req.Category?.Trim() ?? string.Empty,
                TagsJson = System.Text.Json.JsonSerializer.Serialize(req.Tags ?? []),
                ApprovalPolicy = req.ApprovalPolicy ?? "ManualApprove",
                RequiredSkillIdsJson = System.Text.Json.JsonSerializer.Serialize(req.RequiredSkillIds ?? []),
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                RadiusMeters = req.RadiusMeters,
            };
            db.EventTemplates.Add(entity);
            await db.SaveChangesAsync();
            return Results.Created($"/api/organizations/{id}/event-templates/{entity.Id}", new { id = entity.Id });
        });

        group.MapDelete("/{id:guid}/event-templates/{templateId:guid}", async (Guid id, Guid templateId, HttpContext http, AppDbContext db) =>
        {
            if (!await http.CanManageOrganizationAsync(db, id))
                return Results.Forbid();
            var entity = await db.EventTemplates.FirstOrDefaultAsync(t => t.Id == templateId && t.OrganizationId == id);
            if (entity is null) return Results.NotFound();
            db.EventTemplates.Remove(entity);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

}

public record UpdateOrgRequest(string Name, string Description);
