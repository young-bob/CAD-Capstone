using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Applications;

public static class ApplicationEndpoints
{
    public static void MapApplicationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/applications").WithTags("Applications").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/opportunity/{opportunityId:guid}", async (Guid opportunityId, IApplicationQueryService queryService) =>
            Results.Ok(await queryService.GetByOpportunityAsync(opportunityId)));

        group.MapGet("/volunteer/{volunteerId:guid}", async (Guid volunteerId, IApplicationQueryService queryService) =>
            Results.Ok(await queryService.GetByVolunteerAsync(volunteerId)));

        group.MapPost("/{id:guid}/approve", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();

            // Prevent coordinator from approving their own volunteer application
            var callerId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? http.User.FindFirst("sub")?.Value;
            if (callerId != null && Guid.TryParse(callerId, out var callerGuid) && callerGuid == state.VolunteerId)
                return Results.BadRequest(new { Error = "You cannot approve your own application." });

            await grain.Approve();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/reject", async (Guid id, RejectRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            await grain.Reject(req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/accept", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            await grain.AcceptInvitation();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/withdraw", async (Guid id, IGrainFactory grains) =>
        {
            var appGrain = grains.GetGrain<IApplicationGrain>(id);
            var state = await appGrain.GetState();

            var oppGrain = grains.GetGrain<IOpportunityGrain>(state.OpportunityId);
            await oppGrain.WithdrawApplication(id);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/noshow", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            await grain.MarkAsNoShow();
            return Results.NoContent();
        });
    }

}
