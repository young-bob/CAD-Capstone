using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;

namespace VSMS.Grains;

public class OrganizationManagerGrain : Grain, IOrganizationManagerGrain
{
    private readonly IPersistentState<OrganizationManagerState> _state;
    private readonly ILogger<OrganizationManagerGrain> _logger;

    public OrganizationManagerGrain(
        [PersistentState(stateName: "organizationManagerState", storageName: "grain-store")] IPersistentState<OrganizationManagerState> state,
        ILogger<OrganizationManagerGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public async Task UpdateProfile(OrganizationManagerProfile profile)
    {
        _state.State.Profile = profile;
        await _state.WriteStateAsync();
        _logger.LogInformation("Updated profile for organization manager {UserId}", this.GetPrimaryKey());
    }

    public Task<OrganizationManagerProfile?> GetProfile()
    {
        return Task.FromResult(_state.State.Profile);
    }

    public async Task SetOrganization(Guid organizationId)
    {
        if (_state.State.Profile == null)
        {
            throw new InvalidOperationException("Profile must be initialized before setting organization.");
        }

        _state.State.Profile = _state.State.Profile with { OrganizationId = organizationId };
        await _state.WriteStateAsync();
    }

    public Task<Guid?> GetOrganizationId()
    {
        return Task.FromResult(_state.State.Profile?.OrganizationId);
    }
}
