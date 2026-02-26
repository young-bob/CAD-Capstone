using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Microsoft.Extensions.Logging;
using Orleans.Runtime;

namespace VSMS.Grains;

public class OpportunityGrain : Grain, IOpportunityGrain
{
    private readonly IPersistentState<OpportunityState> _state;
    private readonly ILogger<OpportunityGrain> _logger;

    public OpportunityGrain(
        [PersistentState("opportunity", "grain-store")] IPersistentState<OpportunityState> state,
        ILogger<OpportunityGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public async Task UpdateDetails(OpportunityDetails details)
    {
        _state.State.Details = details;
        await _state.WriteStateAsync();
    }

    public Task<OpportunityDetails?> GetDetails()
    {
        return Task.FromResult(_state.State.Details);
    }

    public async Task<Application> SubmitApplication(Guid volunteerId, string notes)
    {
        if (_state.State.Details == null)
        {
            throw new InvalidOperationException("Opportunity details not set.");
        }

        // Check if already applied
        if (_state.State.Applications.Any(a => a.VolunteerId == volunteerId))
        {
            throw new InvalidOperationException("Already applied.");
        }

        // Auto-waitlist when full instead of throwing exception
        var isFull = _state.State.Details.RegisteredCount >= _state.State.Details.MaxVolunteers;
        var initialStatus = isFull ? ApplicationStatus.Waitlisted : ApplicationStatus.Pending;

        var application = new Application(
            Guid.NewGuid(),
            volunteerId,
            this.GetPrimaryKey(),
            DateTime.UtcNow,
            initialStatus,
            string.Empty
        );

        _state.State.Applications.Add(application);
        await _state.WriteStateAsync();

        return application;
    }

    public async Task ProcessApplication(Guid applicationId, ApplicationStatus status, string? rejectionReason = null)
    {
        var appIndex = _state.State.Applications.FindIndex(a => a.AppId == applicationId);
        if (appIndex == -1) throw new KeyNotFoundException("Application not found");

        var app = _state.State.Applications[appIndex];

        // State transition logic
        if (status == ApplicationStatus.Approved)
        {
            if (_state.State.Details == null) throw new InvalidOperationException("Opportunity details not set.");

            if (_state.State.Details.RegisteredCount >= _state.State.Details.MaxVolunteers)
            {
                throw new InvalidOperationException("Cannot approve: Opportunity is full.");
            }

            // Increment count
            var details = _state.State.Details;
            _state.State.Details = details with { RegisteredCount = details.RegisteredCount + 1 };
        }
        else if (app.Status == ApplicationStatus.Approved && status != ApplicationStatus.Approved)
        {
            // Decrement if moving away from Approved
            if (_state.State.Details != null)
            {
                var details = _state.State.Details;
                _state.State.Details = details with { RegisteredCount = details.RegisteredCount - 1 };
            }
        }

        var reason = status == ApplicationStatus.Rejected ? (rejectionReason ?? string.Empty) : string.Empty;
        _state.State.Applications[appIndex] = app with { Status = status, RejectionReason = reason };
        await _state.WriteStateAsync();
    }

    public Task<List<Application>> GetApplications()
    {
        return Task.FromResult(_state.State.Applications);
    }

    public Task<List<Application>> GetEnrollments()
    {
        var enrolled = _state.State.Applications
            .Where(a => a.Status == ApplicationStatus.Approved)
            .ToList();
        return Task.FromResult(enrolled);
    }

    public async Task DeleteOpportunity()
    {
        _state.State.Details = null;
        _state.State.Applications.Clear();
        await _state.WriteStateAsync();
    }
}
