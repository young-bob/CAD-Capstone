using Microsoft.AspNetCore.Mvc;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Opportunities;

public static class OpportunityEndpoints
{
    public static void MapOpportunityEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/opportunities").WithTags("Opportunities").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/", async (string? query, string? category, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.SearchPublishedAsync(query, category));
        });

        group.MapGet("/by-ids", async ([FromQuery] Guid[] ids, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.GetByIdsAsync(ids));
        });

        group.MapPost("/{id:guid}/publish", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Publish();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/cancel", async (Guid id, CancelRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Cancel(req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/shifts", async (Guid id, AddShiftRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.AddShift(req.Name, req.StartTime, req.EndTime, req.MaxCapacity);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/apply", async (Guid id, ApplyRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var appId = await grain.SubmitApplication(req.VolunteerId, req.ShiftId, req.IdempotencyKey);
            return Results.Created($"/api/applications/{appId}", new { ApplicationId = appId });
        });

        group.MapDelete("/{id:guid}/apply/{appId:guid}", async (Guid id, Guid appId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.WithdrawApplication(appId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/validate-geo", async (Guid id, ValidateGeoRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var isValid = await grain.ValidateGeoLocation(req.Lat, req.Lon);
            return Results.Ok(new { isValid });
        });
    }

}
