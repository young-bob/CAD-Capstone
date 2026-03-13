using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Microsoft.Extensions.Logging;
using Orleans.Runtime;

namespace VSMS.Grains;

public class VolunteerGrain : Grain, IVolunteerGrain
{
    private readonly IPersistentState<VolunteerState> _state;
    private readonly ILogger<VolunteerGrain> _logger;

    public VolunteerGrain(
        [PersistentState("volunteer", "grain-store")] IPersistentState<VolunteerState> state,
        ILogger<VolunteerGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public Task<VolunteerProfile?> GetProfile()
    {
        return Task.FromResult(_state.State.Profile);
    }

    public async Task UpdateProfile(VolunteerProfile profile)
    {
        _state.State.Profile = profile;
        await _state.WriteStateAsync();

        var registry = GrainFactory.GetGrain<IRegistryGrain>(0);
        await registry.RegisterVolunteer(profile);

        _logger.LogInformation("Profile updated for volunteer {VolunteerId}", this.GetPrimaryKey());
    }

    public async Task AddCredential(Credential credential)
    {
        if (_state.State.Credentials == null)
            _state.State.Credentials = new List<Credential>();

        _state.State.Credentials.Add(credential);
        await _state.WriteStateAsync();
    }

    public Task<List<Credential>> GetCredentials()
    {
        return Task.FromResult(_state.State.Credentials ?? new List<Credential>());
    }

    public async Task<Application> ApplyForOpportunity(Guid opportunityId)
    {
        _logger.LogInformation("Volunteer {VolunteerId} applying for Opportunity {OpportunityId}", this.GetPrimaryKey(), opportunityId);

        var opportunityGrain = GrainFactory.GetGrain<IOpportunityGrain>(opportunityId);
        var application = await opportunityGrain.SubmitApplication(this.GetPrimaryKey(), string.Empty);

        _state.State.Applications.Add(application);
        await _state.WriteStateAsync();

        _logger.LogInformation("Application submitted. ApplicationId: {ApplicationId}", application.AppId);
        return application;
    }

    public Task<List<Application>> GetApplications()
    {
        return Task.FromResult(_state.State.Applications);
    }

    public Task CheckIn(Guid opportunityId, Location location)
    {
        _logger.LogInformation("Volunteer {VolunteerId} checking in at Opportunity {OpportunityId}", this.GetPrimaryKey(), opportunityId);
        // TODO: Implement actual check-in logic with Coordinator validation
        return Task.CompletedTask;
    }

    public Task CheckOut(Guid opportunityId)
    {
        _logger.LogInformation("Volunteer {VolunteerId} checking out from Opportunity {OpportunityId}", this.GetPrimaryKey(), opportunityId);
        // TODO: Implement check-out logic
        return Task.CompletedTask;
    }

    public Task<List<AttendanceRecord>> GetAttendanceHistory()
    {
        return Task.FromResult(_state.State.AttendanceHistory ?? new List<AttendanceRecord>());
    }

    // Skill management
    public async Task AddSkill(Guid skillId)
    {
        if (!_state.State.SkillIds.Contains(skillId))
        {
            _state.State.SkillIds.Add(skillId);
            await _state.WriteStateAsync();

            // Notify the skill grain to track this volunteer
            var skillGrain = GrainFactory.GetGrain<ISkillGrain>(skillId);
            // Note: SkillGrain needs AddVolunteer method made public or accessible
        }
    }

    public async Task RemoveSkill(Guid skillId)
    {
        if (_state.State.SkillIds.Remove(skillId))
        {
            await _state.WriteStateAsync();
        }
    }

    public Task<List<Guid>> GetSkills()
    {
        return Task.FromResult(_state.State.SkillIds);
    }

    // Certificate management
    public Task<List<Guid>> GetCertificates()
    {
        return Task.FromResult(_state.State.CertificateIds);
    }

    // Organization Membership
    public Task<bool> IsMemberOf(Guid organizationId)
    {
        var isMember = _state.State.JoinedOrganizations != null && _state.State.JoinedOrganizations.Contains(organizationId);
        return Task.FromResult(isMember);
    }

    public async Task ApplyToOrganization(Guid organizationId)
    {
        _logger.LogInformation("Volunteer {VolunteerId} applying to Organization {OrganizationId}", this.GetPrimaryKey(), organizationId);

        if (_state.State.JoinedOrganizations == null)
            _state.State.JoinedOrganizations = new List<Guid>();

        if (!_state.State.JoinedOrganizations.Contains(organizationId))
        {
            _state.State.JoinedOrganizations.Add(organizationId);
            await _state.WriteStateAsync();
            _logger.LogInformation("Successfully joined organization {OrganizationId}", organizationId);
        }
    }
}
