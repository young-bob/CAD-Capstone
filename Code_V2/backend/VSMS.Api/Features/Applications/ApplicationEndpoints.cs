using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Applications;

public static class ApplicationEndpoints
{
    public static void MapApplicationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/applications").WithTags("Applications").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();
            var canView = http.IsSystemAdmin()
                || http.IsSelfByGrainId(state.VolunteerId)
                || await http.CanManageOpportunityAsync(db, state.OpportunityId);
            if (!canView) return Results.Forbid();
            return Results.Ok(state);
        });

        group.MapGet("/opportunity/{opportunityId:guid}", async (Guid opportunityId, int skip, int take, HttpContext http, AppDbContext db, IApplicationQueryService queryService) =>
        {
            if (!await http.CanManageOpportunityAsync(db, opportunityId))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByOpportunityAsync(opportunityId, skip, take));
        });

        group.MapGet("/volunteer/{volunteerId:guid}", async (Guid volunteerId, int skip, int take, HttpContext http, IApplicationQueryService queryService) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByGrainId(volunteerId))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByVolunteerAsync(volunteerId, skip, take));
        });

        group.MapPost("/{id:guid}/approve", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId))
                return Results.Forbid();

            // Prevent coordinator from approving their own volunteer application
            if (http.IsSelfByGrainId(state.VolunteerId))
                return Results.BadRequest(new { Error = "You cannot approve your own application." });

            await grain.Approve();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/reject", async (Guid id, RejectRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId))
                return Results.Forbid();
            await grain.Reject(req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/accept", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.AcceptInvitation();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/withdraw", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            var appGrain = grains.GetGrain<IApplicationGrain>(id);
            var state = await appGrain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();

            var oppGrain = grains.GetGrain<IOpportunityGrain>(state.OpportunityId);
            await oppGrain.WithdrawApplication(id);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/noshow", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IApplicationGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId))
                return Results.Forbid();
            await grain.MarkAsNoShow();
            return Results.NoContent();
        });
    }

}
