using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Attendance;

public static class AttendanceEndpoints
{
    public static void MapAttendanceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/opportunity/{opportunityId:guid}", async (Guid opportunityId, IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetByOpportunityAsync(opportunityId)));

        group.MapGet("/volunteer/{volunteerId:guid}", async (Guid volunteerId, IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetByVolunteerAsync(volunteerId)));

        group.MapGet("/disputes/pending", async (IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetPendingDisputesAsync()));

        group.MapPost("/{id:guid}/init", async (Guid id, InitAttendanceRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.Initialize(req.VolunteerId, req.ApplicationId, req.OpportunityId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/checkin", async (Guid id, CheckInRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.CheckIn(req.Lat, req.Lon, req.ProofPhotoUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/web-checkin", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.WebCheckIn();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/checkout", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.CheckOut();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/dispute", async (Guid id, DisputeRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.RaiseDispute(req.Reason, req.EvidenceUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/confirm", async (Guid id, ConfirmRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.Confirm(req.SupervisorId, req.Rating);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/adjust", async (Guid id, ManualAdjustRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.ManualAdjustment(req.CoordinatorId, req.NewCheckIn, req.NewCheckOut, req.Reason);
            return Results.NoContent();
        });
    }

}
