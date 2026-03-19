using Microsoft.AspNetCore.Mvc;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

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

        group.MapGet("/", async (string? query, string? category, int skip, int take, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.SearchPublishedAsync(query, category, skip, take));
        });

        group.MapGet("/by-ids", async ([FromQuery] Guid[] ids, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.GetByIdsAsync(ids));
        });

        group.MapPost("/{id:guid}/publish", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Publish();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/cancel", async (Guid id, CancelRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Cancel(req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/shifts", async (Guid id, AddShiftRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.AddShift(req.Name, req.StartTime, req.EndTime, req.MaxCapacity);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/apply", async (Guid id, ApplyRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(req.VolunteerId))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var appId = await grain.SubmitApplication(req.VolunteerId, req.ShiftId, req.IdempotencyKey);
            return Results.Created($"/api/applications/{appId}", new { ApplicationId = appId });
        });

        group.MapDelete("/{id:guid}/apply/{appId:guid}", async (Guid id, Guid appId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var appGrain = grains.GetGrain<IApplicationGrain>(appId);
            var state = await appGrain.GetState();
            if (state.OpportunityId != id)
                return Results.BadRequest(new { Error = "Application does not belong to opportunity." });
            if (!http.IsSelfByGrainId(state.VolunteerId) && !await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.WithdrawApplication(appId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/geofence", async (Guid id, SetGeoFenceRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.SetGeoFence(req.Lat, req.Lon, req.RadiusMeters);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/validate-geo", async (Guid id, ValidateGeoRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var isValid = await grain.ValidateGeoLocation(req.Lat, req.Lon);
            return Results.Ok(new { isValid });
        });

        group.MapPut("/{id:guid}/skills", async (Guid id, SetRequiredSkillsRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.SetRequiredSkills(req.SkillIds);
            return Results.NoContent();
        });
        group.MapPut("/{id:guid}/info", async (Guid id, UpdateInfoRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.UpdateInfo(req.Title, req.Description, req.Category, req.Lat, req.Lon, req.RadiusMeters);
            return Results.NoContent();
        });
    }

}
