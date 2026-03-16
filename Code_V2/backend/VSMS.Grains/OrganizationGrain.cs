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

public class OrganizationGrain(
    [PersistentState("organization", "vsms")] IPersistentState<OrganizationState> state,
    IGrainFactory grainFactory,
    IEventBus eventBus,
    ILogger<OrganizationGrain> logger) : Grain, IOrganizationGrain
{
    public async Task Initialize(string name, string description, Guid creatorUserId, string creatorEmail, string? proofUrl = null)
    {
        if (state.State.IsInitialized)
            throw new InvalidOperationException("Organization already initialized.");

        state.State.Name = name;
        state.State.Description = description;
        state.State.Status = OrgStatus.PendingApproval;
        state.State.ProofUrl = proofUrl;
        state.State.Members.Add(new OrgMember
        {
            UserId = creatorUserId,
            Email = creatorEmail,
            Role = OrgRole.Admin
        });
        state.State.IsInitialized = true;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OrganizationCreatedEvent(
            this.GetPrimaryKey(), name, description, OrgStatus.PendingApproval, DateTime.UtcNow
        ));

        logger.LogInformation("Organization {Id} initialized: {Name}", this.GetPrimaryKey(), name);
    }

    public async Task<Guid> CreateOpportunity(string title, string description, string category)
    {
        EnsureApproved();
        var opportunityId = Guid.NewGuid();
        var grain = grainFactory.GetGrain<IOpportunityGrain>(opportunityId);
        await grain.Initialize(this.GetPrimaryKey(), title, description, category);
        state.State.OpportunityIds.Add(opportunityId);
        await state.WriteStateAsync();
        logger.LogInformation("Organization {OrgId} created opportunity {OpportunityId}", this.GetPrimaryKey(), opportunityId);
        return opportunityId;
    }

    public async Task InviteMember(string email, OrgRole role)
    {
        EnsureApproved();
        state.State.Members.Add(new OrgMember { Email = email, Role = role });
        await state.WriteStateAsync();
    }

    public async Task BlockVolunteer(Guid volunteerId)
    {
        state.State.BlockedVolunteerIds.Add(volunteerId);
        await state.WriteStateAsync();
        logger.LogInformation("Organization {OrgId} blocked volunteer {VolunteerId}", this.GetPrimaryKey(), volunteerId);
    }

    public async Task UnblockVolunteer(Guid volunteerId)
    {
        state.State.BlockedVolunteerIds.Remove(volunteerId);
        await state.WriteStateAsync();
    }

    public Task<bool> IsVolunteerBlocked(Guid volunteerId)
        => Task.FromResult(state.State.BlockedVolunteerIds.Contains(volunteerId));

    public async Task SetStatus(OrgStatus status)
    {
        state.State.Status = status;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OrganizationStatusChangedEvent(this.GetPrimaryKey(), status));

        logger.LogInformation("Organization {OrgId} status changed to {Status}", this.GetPrimaryKey(), status);
    }

    public Task<List<Guid>> GetOpportunities() => Task.FromResult(state.State.OpportunityIds);

    public Task<OrganizationState> GetState() => Task.FromResult(state.State);

    public async Task UpdateInfo(string name, string description)
    {
        state.State.Name = name;
        state.State.Description = description;
        await state.WriteStateAsync();
        logger.LogInformation("Organization {OrgId} updated name to {Name}", this.GetPrimaryKey(), name);
    }

    public async Task Resubmit(string name, string description, string? proofUrl)
    {
        state.State.Name = name;
        state.State.Description = description;
        if (proofUrl != null)
            state.State.ProofUrl = proofUrl;
        state.State.Status = OrgStatus.PendingApproval;
        await state.WriteStateAsync();

        await eventBus.PublishAsync(new OrganizationStatusChangedEvent(this.GetPrimaryKey(), OrgStatus.PendingApproval));

        logger.LogInformation("Organization {OrgId} resubmitted with name {Name}", this.GetPrimaryKey(), name);
    }

    private void EnsureApproved()
    {
        if (state.State.Status != OrgStatus.Approved)
            throw new InvalidOperationException($"Organization is not approved. Current status: {state.State.Status}");
    }
}
