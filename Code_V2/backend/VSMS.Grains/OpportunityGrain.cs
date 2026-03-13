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

public class OpportunityGrain(
    [PersistentState("opportunity", "vsms")] IPersistentState<OpportunityState> state,
    IGrainFactory grainFactory,
    IEventBus eventBus,
    ILogger<OpportunityGrain> logger) : Grain, IOpportunityGrain, IRemindable
{
    public async Task Initialize(Guid organizationId, string title, string description, string category)
    {
        state.State.OrganizationId = organizationId;
        state.State.Info = new BasicInfo
        {
            Title = title,
            Description = description,
            Category = category
        };
        state.State.Status = OpportunityStatus.Draft;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OpportunityCreatedEvent(
            this.GetPrimaryKey(), organizationId, title, category, OpportunityStatus.Draft, DateTime.UtcNow, 0
        ));
    }

    public async Task Publish()
    {
        if (state.State.Status != OpportunityStatus.Draft)
            throw new InvalidOperationException($"Cannot publish opportunity in status: {state.State.Status}");
        if (!state.State.Shifts.Any())
            throw new InvalidOperationException("Cannot publish opportunity without shifts.");

        state.State.Status = OpportunityStatus.Published;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OpportunityStatusChangedEvent(this.GetPrimaryKey(), OpportunityStatus.Published));

        logger.LogInformation("Opportunity {Id} published: {Title}", this.GetPrimaryKey(), state.State.Info.Title);
    }

    public async Task UpdateInfo(string title, string description, string category, double lat, double lon, double radiusMeters)
    {
        if (state.State.Status != OpportunityStatus.Draft)
            throw new InvalidOperationException("Opportunity can only be edited while in Draft status.");

        state.State.Info = state.State.Info with { Title = title, Description = description, Category = category };
        state.State.GeoFence = new GeoFenceSettings { Latitude = lat, Longitude = lon, RadiusMeters = radiusMeters };
        await state.WriteStateAsync();

        logger.LogInformation("Opportunity {Id} info updated: {Title}", this.GetPrimaryKey(), title);
    }

    public async Task Cancel(string reason)
    {
        if (state.State.Status is OpportunityStatus.Cancelled or OpportunityStatus.Completed)
            throw new InvalidOperationException($"Cannot cancel opportunity in status: {state.State.Status}");

        state.State.Status = OpportunityStatus.Cancelled;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OpportunityStatusChangedEvent(this.GetPrimaryKey(), OpportunityStatus.Cancelled));

        // Notify all confirmed volunteers
        var notifGrain = grainFactory.GetGrain<INotificationGrain>(Guid.Empty);
        await notifGrain.SendBulkNotification(
            state.State.ConfirmedVolunteerIds.ToList(),
            "OpportunityCancelled",
            $"Opportunity '{state.State.Info.Title}' has been cancelled. Reason: {reason}");

        logger.LogInformation("Opportunity {Id} cancelled: {Reason}", this.GetPrimaryKey(), reason);
    }

    public async Task<Guid> SubmitApplication(Guid volunteerId, Guid shiftId, string idempotencyKey)
    {
        if (state.State.Status != OpportunityStatus.Published)
            throw new InvalidOperationException("Opportunity is not open for applications.");

        // Check if volunteer is blocked by the organization
        var orgGrain = grainFactory.GetGrain<IOrganizationGrain>(state.State.OrganizationId);
        if (await orgGrain.IsVolunteerBlocked(volunteerId))
            throw new InvalidOperationException("Volunteer is blocked by this organization.");

        var shift = state.State.Shifts.FirstOrDefault(s => s.ShiftId == shiftId)
            ?? throw new ArgumentException($"Shift {shiftId} not found.");

        // Create application
        var applicationId = Guid.NewGuid();
        var appGrain = grainFactory.GetGrain<IApplicationGrain>(applicationId);
        await appGrain.Initialize(volunteerId, this.GetPrimaryKey(), shiftId, idempotencyKey);

        // Check capacity and apply policy
        if (shift.CurrentCount < shift.MaxCapacity)
        {
            shift.CurrentCount++;
            if (state.State.Policy == ApprovalPolicy.AutoApprove)
            {
                await appGrain.Approve();
                state.State.ConfirmedVolunteerIds.Add(volunteerId);
            }
            // ManualApprove: stays Pending
        }
        else
        {
            await appGrain.Waitlist();
            state.State.WaitlistQueue.Add(applicationId);
        }

        await state.WriteStateAsync();
        await PublishSpotsUpdatedEvent();

        // Track on volunteer side
        var volunteerGrain = grainFactory.GetGrain<IVolunteerGrain>(volunteerId);
        await volunteerGrain.AddApplicationId(applicationId);

        logger.LogInformation("Application {AppId} submitted by volunteer {VolunteerId} for opportunity {OppId}",
            applicationId, volunteerId, this.GetPrimaryKey());

        return applicationId;
    }

    public async Task WithdrawApplication(Guid applicationId)
    {
        var appGrain = grainFactory.GetGrain<IApplicationGrain>(applicationId);
        var appState = await appGrain.GetState();

        await appGrain.Withdraw();

        // If was confirmed, free the spot
        if (appState.Status == ApplicationStatus.Approved)
        {
            state.State.ConfirmedVolunteerIds.Remove(appState.VolunteerId);
            var shift = state.State.Shifts.FirstOrDefault(s => s.ShiftId == appState.ShiftId);
            if (shift != null) shift.CurrentCount--;
            await TryPromoteFromWaitlist(appState.ShiftId);
        }

        // Remove from waitlist if present
        state.State.WaitlistQueue.Remove(applicationId);
        await state.WriteStateAsync();
        await PublishSpotsUpdatedEvent();

        // Remove from volunteer tracking
        var volunteerGrain = grainFactory.GetGrain<IVolunteerGrain>(appState.VolunteerId);
        await volunteerGrain.RemoveApplicationId(applicationId);
    }

    public async Task TryPromoteFromWaitlist(Guid shiftId)
    {
        var shift = state.State.Shifts.FirstOrDefault(s => s.ShiftId == shiftId);
        if (shift == null || shift.CurrentCount >= shift.MaxCapacity) return;

        while (state.State.WaitlistQueue.Count > 0 && shift.CurrentCount < shift.MaxCapacity)
        {
            var nextAppId = state.State.WaitlistQueue[0];
            state.State.WaitlistQueue.RemoveAt(0);

            var appGrain = grainFactory.GetGrain<IApplicationGrain>(nextAppId);
            await appGrain.Promote();

            shift.CurrentCount++;
            logger.LogInformation("Promoted application {AppId} from waitlist", nextAppId);
        }

        await state.WriteStateAsync();
        await PublishSpotsUpdatedEvent();
    }

    public Task<bool> ValidateGeoLocation(double lat, double lon)
    {
        if (state.State.GeoFence == null) return Task.FromResult(true);

        var distance = CalculateDistance(
            state.State.GeoFence.Latitude, state.State.GeoFence.Longitude, lat, lon);
        return Task.FromResult(distance <= state.State.GeoFence.RadiusMeters);
    }

    public async Task SetGeoFence(double lat, double lon, double radiusMeters)
    {
        state.State.GeoFence = new GeoFenceSettings
        {
            Latitude = lat,
            Longitude = lon,
            RadiusMeters = radiusMeters
        };
        await state.WriteStateAsync();
        logger.LogInformation("Opportunity {Id} geofence updated: Lat {Lat}, Lon {Lon}, Radius {Radius}m",
            this.GetPrimaryKey(), lat, lon, radiusMeters);
    }

    public async Task AddShift(string name, DateTime startTime, DateTime endTime, int maxCapacity)
    {
        state.State.Shifts.Add(new Shift
        {
            Name = name,
            StartTime = startTime,
            EndTime = endTime,
            MaxCapacity = maxCapacity
        });
        await state.WriteStateAsync();
        await PublishSpotsUpdatedEvent();
    }

    public Task<OpportunityState> GetState() => Task.FromResult(state.State);

    public Task ReceiveReminder(string reminderName, TickStatus status)
    {
        logger.LogInformation("Opportunity {Id} received reminder: {Reminder}", this.GetPrimaryKey(), reminderName);
        return Task.CompletedTask;
    }

    private async Task PublishSpotsUpdatedEvent()
    {
        var totalSpots = state.State.Shifts.Sum(s => s.MaxCapacity);
        var availableSpots = state.State.Shifts.Sum(s => Math.Max(0, s.MaxCapacity - s.CurrentCount));
        await eventBus.PublishAsync(new OpportunitySpotsUpdatedEvent(this.GetPrimaryKey(), availableSpots, totalSpots));
    }

    /// <summary>Haversine formula to calculate distance in meters between two geo points.</summary>
    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // Earth radius in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;

    public async Task SetRequiredSkills(List<Guid> skillIds)
    {
        state.State.RequiredSkillIds = skillIds;
        await state.WriteStateAsync();
        // Publish event so the read-side OpportunityReadModel stays in sync (no need to activate grain for queries)
        await eventBus.PublishAsync(new OpportunitySkillsUpdatedEvent(this.GetPrimaryKey(), skillIds));
        logger.LogInformation("Opportunity {Id} required skills updated: {Count} skills", this.GetPrimaryKey(), skillIds.Count);
    }
}
