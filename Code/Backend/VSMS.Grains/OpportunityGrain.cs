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
        [PersistentState("opportunity", "OrleansStorage")] IPersistentState<OpportunityState> state,
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
        // Concurrency Control: Check Capacity
        if (_state.State.Details == null)
        {
            throw new InvalidOperationException("Opportunity details not set.");
        }

        if (_state.State.Details.RegisteredCount >= _state.State.Details.MaxVolunteers)
        {
            throw new InvalidOperationException("Opportunity is full.");
        }

        // Check if already applied
        if (_state.State.Applications.Any(a => a.VolunteerId == volunteerId))
        {
            throw new InvalidOperationException("Already applied.");
        }

        var application = new Application(
            Guid.NewGuid(),
            volunteerId,
            this.GetPrimaryKey(),
            DateTime.UtcNow,
            ApplicationStatus.Pending,
            string.Empty
        );

        _state.State.Applications.Add(application);

        // Update Registered Count (assuming pending counts as registered or update logic later)
        // Usually only Approved counts, but if auto-approve or reservation...
        // For now, let's assume Pending doesn't take a slot, or it does? 
        // Plan says: "Checks RegisteredCount < MaxVolunteers". 
        // Let's increment registered count only on Approval? Or on SignUp?
        // If "Sign-Up" implies instant registration, then increment. 
        // If "Application" implies approval needed, then don't increment yet.
        // UML says "Application: Submits". So probably needs approval.
        // But for "Sign Up" problem mentioned in feasibility, it implies claiming a spot.
        // I'll assume for this implementation that SubmitApplication reserves a spot if Auto-Approve, 
        // or just creates Application. 
        // If just creates Application, then capacity check should be on Approval.
        // However, usually we want to limit applications too (waitlist).
        // Let's keep it simple: create application.

        await _state.WriteStateAsync();

        return application;
    }

    public async Task ProcessApplication(Guid applicationId, ApplicationStatus status)
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

        _state.State.Applications[appIndex] = app with { Status = status };
        await _state.WriteStateAsync();
    }

    public Task<List<Application>> GetApplications()
    {
        return Task.FromResult(_state.State.Applications);
    }
}
