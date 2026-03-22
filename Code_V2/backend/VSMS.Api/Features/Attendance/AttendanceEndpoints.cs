using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Attendance;

public static class AttendanceEndpoints
{
    public static void MapAttendanceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            var canView = http.IsSystemAdmin()
                || http.IsSelfByGrainId(state.VolunteerId)
                || await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
            if (!canView) return Results.Forbid();
            return Results.Ok(state);
        });

        group.MapGet("/opportunity/{opportunityId:guid}", async (Guid opportunityId, int? skip, int? take, HttpContext http, AppDbContext db, IAttendanceQueryService queryService, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, opportunityId, grains))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByOpportunityAsync(opportunityId, skip ?? 0, take ?? 500));
        });

        group.MapGet("/volunteer/{volunteerId:guid}", async (Guid volunteerId, int? skip, int? take, HttpContext http, IAttendanceQueryService queryService) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByGrainId(volunteerId))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByVolunteerAsync(volunteerId, skip ?? 0, take ?? 500));
        });

        group.MapGet("/disputes/pending", async (int? skip, int? take, IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetPendingDisputesAsync(skip ?? 0, take ?? 500)))
            .RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        group.MapPost("/{id:guid}/init", async (Guid id, InitAttendanceRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, req.OpportunityId, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.Initialize(req.VolunteerId, req.ApplicationId, req.OpportunityId, req.ShiftId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/checkin", async (Guid id, CheckInRequest req, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.CheckIn(req.Lat, req.Lon, req.ProofPhotoUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/web-checkin", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.WebCheckIn();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/checkout", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            var canAct = http.IsSelfByGrainId(state.VolunteerId)
                || await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
            if (!canAct) return Results.Forbid();
            await grain.CheckOut();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/coordinator-checkin", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.CoordinatorCheckIn();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/dispute", async (Guid id, DisputeRequest req, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.RaiseDispute(req.Reason, req.EvidenceUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/confirm", async (Guid id, ConfirmRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.Confirm(req.SupervisorId, req.Rating);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/adjust", async (Guid id, ManualAdjustRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.ManualAdjustment(req.CoordinatorId, req.NewCheckIn, req.NewCheckOut, req.Reason);
            return Results.NoContent();
        });
    }

}
