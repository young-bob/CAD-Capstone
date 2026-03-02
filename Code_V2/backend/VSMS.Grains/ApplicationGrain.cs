using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Abstractions.States;

namespace VSMS.Grains;

public class ApplicationGrain(
    [PersistentState("application", "vsms")] IPersistentState<ApplicationState> state,
    IGrainFactory grainFactory,
    IEventBus eventBus,
    ILogger<ApplicationGrain> logger) : Grain, IApplicationGrain, IRemindable
{
    public async Task Initialize(Guid volunteerId, Guid opportunityId, Guid shiftId, string idempotencyKey)
    {
        state.State.VolunteerId = volunteerId;
        state.State.OpportunityId = opportunityId;
        state.State.ShiftId = shiftId;
        state.State.IdempotencyKey = idempotencyKey;
        state.State.Status = ApplicationStatus.Pending;
        await state.WriteStateAsync();

        // Fetch metadata for Read Model event
        var opp = await grainFactory.GetGrain<IOpportunityGrain>(opportunityId).GetState();
        var vol = await grainFactory.GetGrain<IVolunteerGrain>(volunteerId).GetProfile();
        var shift = opp.Shifts.FirstOrDefault(s => s.ShiftId == shiftId);

        await eventBus.PublishAsync(new ApplicationSubmittedEvent(
            this.GetPrimaryKey(), opportunityId, shiftId,
            opp.Info.Title, shift?.Name ?? "Unknown Shift",
            shift?.StartTime ?? DateTime.UtcNow, shift?.EndTime ?? DateTime.UtcNow,
            volunteerId, string.IsNullOrWhiteSpace(vol.FirstName) ? "Unknown Volunteer" : $"{vol.FirstName} {vol.LastName}".Trim(),
            ApplicationStatus.Pending, DateTime.UtcNow
        ));

        logger.LogInformation("ApplicationSubmittedEvent successfully published to EventBus for {AppId}", this.GetPrimaryKey());
    }

    public async Task Approve()
    {
        EnsureStatus(ApplicationStatus.Pending, ApplicationStatus.Promoted);
        state.State.Status = ApplicationStatus.Approved;
        await state.WriteStateAsync();

        // Notify volunteer
        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(state.State.VolunteerId, "ApplicationApproved",
            $"Your application has been approved.");

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Approved));

        logger.LogInformation("Application {Id} approved", this.GetPrimaryKey());
    }

    public async Task Reject(string reason)
    {
        EnsureStatus(ApplicationStatus.Pending);
        state.State.Status = ApplicationStatus.Rejected;
        await state.WriteStateAsync();

        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(state.State.VolunteerId, "ApplicationRejected",
            $"Your application has been rejected. Reason: {reason}");

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Rejected));

        logger.LogInformation("Application {Id} rejected: {Reason}", this.GetPrimaryKey(), reason);
    }

    public async Task Waitlist()
    {
        EnsureStatus(ApplicationStatus.Pending);
        state.State.Status = ApplicationStatus.Waitlisted;
        await state.WriteStateAsync();

        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(state.State.VolunteerId, "ApplicationWaitlisted",
            "You have been added to the waitlist.");

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Waitlisted));
    }

    public async Task Promote()
    {
        EnsureStatus(ApplicationStatus.Waitlisted);
        state.State.Status = ApplicationStatus.Promoted;
        state.State.ExpirationTime = DateTime.UtcNow.AddHours(24);
        await state.WriteStateAsync();

        // Set 24h acceptance timeout reminder
        await this.RegisterOrUpdateReminder("AcceptanceTimeout", TimeSpan.FromHours(24), TimeSpan.FromHours(24));

        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(state.State.VolunteerId, "ApplicationPromoted",
            "A spot has opened up! Please accept within 24 hours.");

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Promoted));

        logger.LogInformation("Application {Id} promoted from waitlist", this.GetPrimaryKey());
    }

    public async Task Withdraw()
    {
        if (state.State.Status is ApplicationStatus.Completed or ApplicationStatus.Rejected or ApplicationStatus.NoShow)
            throw new InvalidOperationException($"Cannot withdraw application in status: {state.State.Status}");

        state.State.Status = ApplicationStatus.Withdrawn;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Withdrawn));

        logger.LogInformation("Application {Id} withdrawn", this.GetPrimaryKey());
    }

    public async Task MarkAsNoShow()
    {
        EnsureStatus(ApplicationStatus.Approved);
        state.State.Status = ApplicationStatus.NoShow;
        await state.WriteStateAsync();

        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(state.State.VolunteerId, "MarkedAsNoShow",
            "You have been marked as a no-show.");

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.NoShow));

        logger.LogInformation("Application {Id} marked as no-show", this.GetPrimaryKey());
    }

    public async Task AcceptInvitation()
    {
        EnsureStatus(ApplicationStatus.Promoted);
        state.State.Status = ApplicationStatus.Approved;
        state.State.ExpirationTime = null;
        await state.WriteStateAsync();

        // Cancel the timeout reminder
        var reminder = await this.GetReminder("AcceptanceTimeout");
        if (reminder != null) await this.UnregisterReminder(reminder);

        await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Approved));

        logger.LogInformation("Application {Id} invitation accepted", this.GetPrimaryKey());
    }

    public Task<ApplicationState> GetState() => Task.FromResult(state.State);

    public async Task ReceiveReminder(string reminderName, TickStatus status)
    {
        if (reminderName == "AcceptanceTimeout" && state.State.Status == ApplicationStatus.Promoted)
        {
            // Timeout: return to waitlist
            state.State.Status = ApplicationStatus.Waitlisted;
            state.State.ExpirationTime = null;
            await state.WriteStateAsync();

            // Try promoting next person
            var oppGrain = grainFactory.GetGrain<IOpportunityGrain>(state.State.OpportunityId);
            await oppGrain.TryPromoteFromWaitlist(state.State.ShiftId);

            await eventBus.PublishAsync(new ApplicationStatusChangedEvent(this.GetPrimaryKey(), ApplicationStatus.Waitlisted));

            logger.LogInformation("Application {Id} acceptance timed out, returned to waitlist", this.GetPrimaryKey());
        }

        // Clean up reminder
        var reminder = await this.GetReminder(reminderName);
        if (reminder != null) await this.UnregisterReminder(reminder);
    }

    private void EnsureStatus(params ApplicationStatus[] allowed)
    {
        if (!allowed.Contains(state.State.Status))
            throw new InvalidOperationException(
                $"Invalid status transition. Current: {state.State.Status}, Allowed: {string.Join(", ", allowed)}");
    }
}
