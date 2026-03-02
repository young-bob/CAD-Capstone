using VSMS.Abstractions.Grains;

namespace VSMS.Api.Features.Coordinators;

public static class CoordinatorEndpoints
{
    public static void MapCoordinatorEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/coordinators").WithTags("Coordinators").RequireAuthorization();

        // Get profile
        group.MapGet("/{id:guid}/profile", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<ICoordinatorGrain>(id);
            return Results.Ok(await grain.GetProfile());
        });

        // Update profile
        group.MapPut("/{id:guid}/profile", async (Guid id, UpdateCoordinatorProfileRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<ICoordinatorGrain>(id);
            await grain.UpdateProfile(req.FirstName, req.LastName, req.Phone);
            return Results.NoContent();
        });

        // Bind to an organization
        group.MapPost("/{id:guid}/organization", async (Guid id, SetOrgRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<ICoordinatorGrain>(id);
            await grain.SetOrganization(req.OrganizationId);
            return Results.NoContent();
        });

        // Get associated organization ID
        group.MapGet("/{id:guid}/organization", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<ICoordinatorGrain>(id);
            var orgId = await grain.GetOrganizationId();
            return orgId.HasValue ? Results.Ok(new { organizationId = orgId }) : Results.NotFound();
        });

        // Register push token
        group.MapPost("/{id:guid}/push-token", async (Guid id, CoordinatorPushTokenRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<ICoordinatorGrain>(id);
            await grain.RegisterPushToken(req.Token);
            return Results.NoContent();
        });
    }
}

// ==================== Request / Response DTOs ====================

public record UpdateCoordinatorProfileRequest(string FirstName, string LastName, string Phone);
public record SetOrgRequest(Guid OrganizationId);
public record CoordinatorPushTokenRequest(string Token);
