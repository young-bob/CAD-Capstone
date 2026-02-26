using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Orleans.Runtime;

namespace VSMS.Grains;

public class CoordinatorGrain : Grain, ICoordinatorGrain
{
    private readonly IPersistentState<CoordinatorState> _state;

    public CoordinatorGrain(
        [PersistentState("coordinator", "grain-store")] IPersistentState<CoordinatorState> state)
    {
        _state = state;
    }

    public async Task SetOrganization(string organizationId)
    {
        _state.State.OrganizationId = organizationId;
        await _state.WriteStateAsync();
    }

    public async Task UpdateProfile(CoordinatorProfile profile)
    {
        _state.State.OrganizationId = profile.OrganizationId.ToString();
        _state.State.JobTitle = profile.JobTitle;
        await _state.WriteStateAsync();

        var registry = GrainFactory.GetGrain<IRegistryGrain>(0);
        await registry.RegisterCoordinator(profile);
    }

    public async Task<CoordinatorProfile?> GetProfile()
    {
        var userGrain = GrainFactory.GetGrain<IUserGrain>(this.GetPrimaryKey());
        var userProfile = await userGrain.GetProfile();

        if (userProfile == null) return null;

        var orgId = Guid.TryParse(_state.State.OrganizationId, out var id) ? id : Guid.Empty;

        return new CoordinatorProfile(
            this.GetPrimaryKey(),
            userProfile.Email, // Email as Name fallback if missing elsewhere, though User model lacks Name
            userProfile.Email,
            orgId,
            _state.State.JobTitle
        );
    }

    public async Task CreateShift(Guid opportunityId)
    {
        if (string.IsNullOrEmpty(_state.State.OrganizationId))
            throw new InvalidOperationException("Coordinator not assigned to an organization.");

        await Task.CompletedTask;
    }

    public Task ValidateAttendance(Guid volunteerId, Guid opportunityId)
    {
        return Task.CompletedTask;
    }
}
