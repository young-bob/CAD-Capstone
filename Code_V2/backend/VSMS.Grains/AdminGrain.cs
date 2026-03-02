using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Abstractions.States;
using VSMS.Abstractions.ValueObjects;

namespace VSMS.Grains;

public class AdminGrain(
    [PersistentState("admin", "vsms")] IPersistentState<AdminState> state,
    IGrainFactory grainFactory,
    IEventBus eventBus,
    ILogger<AdminGrain> logger) : Grain, IAdminGrain
{
    public async Task Initialize(Guid userId)
    {
        state.State.UserId = userId;
        state.State.Role = AdminRole.SuperAdmin;
        state.State.IsInitialized = true;
        await state.WriteStateAsync();
    }

    public async Task ApproveOrganization(Guid orgId)
    {
        var orgGrain = grainFactory.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.SetStatus(OrgStatus.Approved);

        state.State.ActionLog.Add(new AuditLog
        {
            OperatorId = state.State.UserId,
            Action = "ApproveOrganization",
            Reason = $"Organization {orgId} approved"
        });
        await state.WriteStateAsync();
        logger.LogInformation("Admin {AdminId} approved organization {OrgId}", this.GetPrimaryKey(), orgId);
    }

    public async Task RejectOrganization(Guid orgId, string reason)
    {
        var orgGrain = grainFactory.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.SetStatus(OrgStatus.Rejected);

        state.State.ActionLog.Add(new AuditLog
        {
            OperatorId = state.State.UserId,
            Action = "RejectOrganization",
            Reason = reason
        });
        await state.WriteStateAsync();
        logger.LogInformation("Admin {AdminId} rejected organization {OrgId}: {Reason}", this.GetPrimaryKey(), orgId, reason);
    }

    public async Task BanUser(Guid userId)
    {
        state.State.ActionLog.Add(new AuditLog
        {
            OperatorId = state.State.UserId,
            Action = "BanUser",
            Reason = $"User {userId} banned"
        });
        await state.WriteStateAsync();
        await eventBus.PublishAsync(new UserBannedEvent(userId));
        logger.LogWarning("Admin {AdminId} banned user {UserId}", this.GetPrimaryKey(), userId);
    }

    public async Task UnbanUser(Guid userId)
    {
        state.State.ActionLog.Add(new AuditLog
        {
            OperatorId = state.State.UserId,
            Action = "UnbanUser",
            Reason = $"User {userId} unbanned"
        });
        await state.WriteStateAsync();
        await eventBus.PublishAsync(new UserUnbannedEvent(userId));
    }

    public async Task ResolveDispute(Guid attendanceId, string resolution, double adjustedHours)
    {
        var attendanceGrain = grainFactory.GetGrain<IAttendanceRecordGrain>(attendanceId);
        await attendanceGrain.ResolveDispute(state.State.UserId, resolution, adjustedHours);

        state.State.ActionLog.Add(new AuditLog
        {
            OperatorId = state.State.UserId,
            Action = "ResolveDispute",
            Reason = resolution
        });
        await state.WriteStateAsync();
    }

    public Task<AdminState> GetState() => Task.FromResult(state.State);
}
