using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.States;
using VSMS.Abstractions.ValueObjects;
using VSMS.Abstractions.Services;

namespace VSMS.Grains;

public class AttendanceRecordGrain(
    [PersistentState("attendance", "vsms")] IPersistentState<AttendanceRecordState> state,
    IGrainFactory grainFactory,
    IEventBus eventBus,
    ILogger<AttendanceRecordGrain> logger) : Grain, IAttendanceRecordGrain, IRemindable
{
    public async Task Initialize(Guid volunteerId, Guid applicationId, Guid opportunityId, Guid? shiftId = null)
    {
        // Idempotent: skip if already initialized
        if (state.State.VolunteerId != Guid.Empty)
            return;

        state.State.VolunteerId = volunteerId;
        state.State.ApplicationId = applicationId;
        state.State.OpportunityId = opportunityId;
        state.State.Status = AttendanceStatus.Pending;
        await state.WriteStateAsync();

        // Fetch metadata needed for the Read Model
        var volProfile = await grainFactory.GetGrain<IVolunteerGrain>(volunteerId).GetProfile();
        var oppState = await grainFactory.GetGrain<IOpportunityGrain>(opportunityId).GetState();
        var shift = shiftId.HasValue ? oppState.Shifts.FirstOrDefault(s => s.ShiftId == shiftId.Value) : null;
        var volunteerName = string.IsNullOrWhiteSpace(volProfile.FirstName)
            ? "Unknown Volunteer"
            : $"{volProfile.FirstName} {volProfile.LastName}".Trim();

        // Publish event so EF Core Read Model (AttendanceReadModels table) gets written
        // This makes the record visible in Volunteer's "My Attendance" with Pending status
        await eventBus.PublishAsync(new AttendanceRecordedEvent(
            this.GetPrimaryKey(), opportunityId, volunteerId,
            volunteerName, oppState.Info.Title,
            AttendanceStatus.Pending, null, null, 0,
            ShiftStartTime: shift?.StartTime));

        logger.LogInformation("AttendanceRecord {Id} initialized for volunteer {VolId}", this.GetPrimaryKey(), volunteerId);
    }

    public async Task CheckIn(double lat, double lon, string proofPhotoUrl)
    {
        if (state.State.Status != AttendanceStatus.Pending)
            throw new InvalidOperationException($"Cannot check in with status: {state.State.Status}");

        // Retrieve shift start time
        var oppState = await grainFactory.GetGrain<IOpportunityGrain>(state.State.OpportunityId).GetState();
        var appState = await grainFactory.GetGrain<IApplicationGrain>(state.State.ApplicationId).GetState();
        var shift = oppState.Shifts.FirstOrDefault(s => s.ShiftId == appState.ShiftId);
        
        if (shift != null && DateTime.UtcNow < shift.StartTime.AddMinutes(-30))
        {
            throw new InvalidOperationException($"Too early to check in. You can check in 30 minutes before the shift starts ({shift.StartTime.ToLocalTime():g}).");
        }

        // Validate geolocation
        var oppGrain = grainFactory.GetGrain<IOpportunityGrain>(state.State.OpportunityId);
        var isValid = await oppGrain.ValidateGeoLocation(lat, lon);
        if (!isValid)
            throw new InvalidOperationException("Check-in location is outside the geofence.");

        state.State.VerifiedTime = new TimeRecord { CheckInTime = DateTime.UtcNow };
        state.State.CheckInSnapshot = new GeoFenceSettings { Latitude = lat, Longitude = lon };
        state.State.ProofPhotoUrl = proofPhotoUrl;
        state.State.Status = AttendanceStatus.CheckedIn;
        await state.WriteStateAsync();

        var volProfile = await grainFactory.GetGrain<IVolunteerGrain>(state.State.VolunteerId).GetProfile();

        var volunteerName = string.IsNullOrWhiteSpace(volProfile.FirstName) ? "Unknown Volunteer" : $"{volProfile.FirstName} {volProfile.LastName}".Trim();

        await eventBus.PublishAsync(new AttendanceRecordedEvent(
            this.GetPrimaryKey(), state.State.OpportunityId, state.State.VolunteerId,
            volunteerName, oppState.Info.Title,
            AttendanceStatus.CheckedIn, state.State.VerifiedTime.CheckInTime, null, 0
        ));

        // Set auto-checkout reminder (8 hours)
        await this.RegisterOrUpdateReminder("AutoCheckout", TimeSpan.FromHours(8), TimeSpan.FromHours(8));

        logger.LogInformation("Volunteer {VolunteerId} checked in to {OpportunityId}",
            state.State.VolunteerId, state.State.OpportunityId);
    }

    public async Task WebCheckIn()
    {
        if (state.State.Status != AttendanceStatus.Pending)
            throw new InvalidOperationException($"Cannot check in with status: {state.State.Status}");

        // Retrieve shift start time
        var oppState = await grainFactory.GetGrain<IOpportunityGrain>(state.State.OpportunityId).GetState();
        var appState = await grainFactory.GetGrain<IApplicationGrain>(state.State.ApplicationId).GetState();
        var shift = oppState.Shifts.FirstOrDefault(s => s.ShiftId == appState.ShiftId);
        
        if (shift != null && DateTime.UtcNow < shift.StartTime.AddMinutes(-30))
        {
            throw new InvalidOperationException($"Too early to check in. You can check in 30 minutes before the shift starts ({shift.StartTime.ToLocalTime():g}).");
        }

        state.State.VerifiedTime = new TimeRecord { CheckInTime = DateTime.UtcNow };
        state.State.CheckInSnapshot = new GeoFenceSettings { Latitude = 0, Longitude = 0 }; // Web bypass
        state.State.ProofPhotoUrl = "web-check-in";
        state.State.Status = AttendanceStatus.CheckedIn;
        await state.WriteStateAsync();

        var volProfile = await grainFactory.GetGrain<IVolunteerGrain>(state.State.VolunteerId).GetProfile();

        var volunteerName = string.IsNullOrWhiteSpace(volProfile.FirstName) ? "Unknown Volunteer" : $"{volProfile.FirstName} {volProfile.LastName}".Trim();

        await eventBus.PublishAsync(new AttendanceRecordedEvent(
            this.GetPrimaryKey(), state.State.OpportunityId, state.State.VolunteerId,
            volunteerName, oppState.Info.Title,
            AttendanceStatus.CheckedIn, state.State.VerifiedTime.CheckInTime, null, 0
        ));

        // Set auto-checkout reminder (8 hours)
        await this.RegisterOrUpdateReminder("AutoCheckout", TimeSpan.FromHours(8), TimeSpan.FromHours(8));

        logger.LogInformation("Volunteer {VolunteerId} Web-checked in to {OpportunityId}",
            state.State.VolunteerId, state.State.OpportunityId);
    }

    public async Task CheckOut(DateTime? timeOut = null)
    {
        if (state.State.Status != AttendanceStatus.CheckedIn)
            throw new InvalidOperationException($"Cannot check out with status: {state.State.Status}");

        if (state.State.VerifiedTime != null)
            state.State.VerifiedTime = state.State.VerifiedTime with
            {
                CheckOutTime = timeOut ?? DateTime.UtcNow
            };

        state.State.Status = AttendanceStatus.CheckedOut;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new AttendanceStatusChangedEvent(
            this.GetPrimaryKey(), AttendanceStatus.CheckedOut, state.State.VerifiedTime?.CheckOutTime, state.State.VerifiedTime?.TotalHours ?? 0));

        // Cancel auto-checkout reminder
        var reminder = await this.GetReminder("AutoCheckout");
        if (reminder != null) await this.UnregisterReminder(reminder);

        logger.LogInformation("Volunteer {VolunteerId} checked out, hours: {Hours:F1}",
            state.State.VolunteerId, state.State.VerifiedTime?.TotalHours ?? 0);
    }

    public async Task ManualAdjustment(Guid coordinatorId, DateTime newCheckIn, DateTime newCheckOut, string reason)
    {
        state.State.VerifiedTime = new TimeRecord
        {
            CheckInTime = newCheckIn,
            CheckOutTime = newCheckOut
        };
        state.State.Modifications.Add(new AuditLog
        {
            OperatorId = coordinatorId,
            Action = "ManualAdjustment",
            Reason = reason
        });
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new AttendanceStatusChangedEvent(
            this.GetPrimaryKey(), state.State.Status, newCheckOut, state.State.VerifiedTime.TotalHours));
    }

    public async Task RaiseDispute(string reason, string evidenceUrl)
    {
        if (state.State.Status != AttendanceStatus.CheckedOut)
            throw new InvalidOperationException("Can only dispute after checkout.");

        state.State.DisputeLog = new DisputeInfo
        {
            RaisedByVolunteerId = state.State.VolunteerId,
            Reason = reason,
            EvidenceUrl = evidenceUrl,
            Status = DisputeStatus.Open
        };
        state.State.Status = AttendanceStatus.Disputed;
        await state.WriteStateAsync();

        var volProfile = await grainFactory.GetGrain<IVolunteerGrain>(state.State.VolunteerId).GetProfile();
        var oppState = await grainFactory.GetGrain<IOpportunityGrain>(state.State.OpportunityId).GetState();

        var volunteerName = string.IsNullOrWhiteSpace(volProfile.FirstName) ? "Unknown Volunteer" : $"{volProfile.FirstName} {volProfile.LastName}".Trim();

        await eventBus.PublishAsync(new DisputeRaisedEvent(
            this.GetPrimaryKey(), state.State.VolunteerId, volunteerName,
            oppState.Info.Title, reason, evidenceUrl, DateTime.UtcNow
        ));

        var notif = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notif.SendNotification(Guid.Empty, "AttendanceDisputed",
            $"Dispute raised for attendance {this.GetPrimaryKey()}: {reason}");
    }

    public async Task ResolveDispute(Guid resolverId, string resolution, double adjustedHours)
    {
        if (state.State.Status != AttendanceStatus.Disputed)
            throw new InvalidOperationException("No active dispute to resolve.");

        if (state.State.DisputeLog != null)
        {
            state.State.DisputeLog.Status = DisputeStatus.Resolved;
            state.State.DisputeLog.Resolution = resolution;
            state.State.DisputeLog.AdjustedHours = adjustedHours;
            state.State.DisputeLog.ResolvedAt = DateTime.UtcNow;
        }

        state.State.Modifications.Add(new AuditLog
        {
            OperatorId = resolverId,
            Action = "ResolveDispute",
            Reason = resolution
        });
        state.State.Status = AttendanceStatus.Resolved;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new DisputeResolvedEvent(this.GetPrimaryKey(), AttendanceStatus.Resolved));
    }

    public async Task Confirm(Guid supervisorId, int rating)
    {
        if (state.State.Status is not (AttendanceStatus.CheckedOut or AttendanceStatus.Resolved))
            throw new InvalidOperationException($"Cannot confirm with status: {state.State.Status}");

        state.State.SupervisorRating = rating;
        state.State.Status = AttendanceStatus.Confirmed;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new AttendanceStatusChangedEvent(
            this.GetPrimaryKey(), AttendanceStatus.Confirmed, state.State.VerifiedTime?.CheckOutTime, state.State.VerifiedTime?.TotalHours ?? 0));

        // Update volunteer impact score
        var hours = state.State.DisputeLog?.AdjustedHours ?? state.State.VerifiedTime?.TotalHours ?? 0;
        var volunteerGrain = grainFactory.GetGrain<IVolunteerGrain>(state.State.VolunteerId);
        await volunteerGrain.AddCompletedHours(hours);
        await volunteerGrain.IncrementCompletedOpportunities();

        logger.LogInformation("Attendance {Id} confirmed by supervisor {SupervisorId}, {Hours:F1}h",
            this.GetPrimaryKey(), supervisorId, hours);
    }

    public Task<AttendanceRecordState> GetState() => Task.FromResult(state.State);

    public async Task ReceiveReminder(string reminderName, TickStatus status)
    {
        if (reminderName == "AutoCheckout" && state.State.Status == AttendanceStatus.CheckedIn)
        {
            await CheckOut();
            logger.LogInformation("Auto-checkout triggered for attendance {Id}", this.GetPrimaryKey());
        }

        var reminder = await this.GetReminder(reminderName);
        if (reminder != null) await this.UnregisterReminder(reminder);
    }
}
