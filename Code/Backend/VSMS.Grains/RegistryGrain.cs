using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class RegistryGrain : Grain, IRegistryGrain
{
    private readonly IPersistentState<RegistryState> _state;
    private readonly ILogger<RegistryGrain> _logger;

    public RegistryGrain(
        [PersistentState("registry", "grain-store")] IPersistentState<RegistryState> state,
        ILogger<RegistryGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public async Task RegisterOrganization(OrganizationProfile profile)
    {
        _state.State.Organizations[profile.OrganizationId] = profile;
        await _state.WriteStateAsync();
        _logger.LogInformation("Registered organization {OrganizationId}", profile.OrganizationId);
    }

    public async Task RegisterVolunteer(VolunteerProfile profile)
    {
        _state.State.Volunteers[profile.UserId] = profile;
        await _state.WriteStateAsync();
        _logger.LogInformation("Registered volunteer {VolunteerId}", profile.UserId);
    }

    public async Task RegisterUser(User user)
    {
        _state.State.Users[user.UserId] = user;
        await _state.WriteStateAsync();
        _logger.LogInformation("Registered user {UserId}", user.UserId);
    }

    public Task<List<OrganizationProfile>> GetOrganizations()
    {
        return Task.FromResult(_state.State.Organizations.Values.ToList());
    }

    public Task<List<VolunteerProfile>> GetVolunteers()
    {
        return Task.FromResult(_state.State.Volunteers.Values.ToList());
    }

    public Task<List<User>> GetUsers()
    {
        return Task.FromResult(_state.State.Users.Values.ToList());
    }

    public async Task RemoveOrganization(Guid organizationId)
    {
        if (_state.State.Organizations.Remove(organizationId))
        {
            await _state.WriteStateAsync();
            _logger.LogInformation("Removed organization {OrganizationId}", organizationId);
        }
    }

    public async Task RemoveVolunteer(Guid volunteerId)
    {
        if (_state.State.Volunteers.Remove(volunteerId))
        {
            await _state.WriteStateAsync();
            _logger.LogInformation("Removed volunteer {VolunteerId}", volunteerId);
        }
    }

    public async Task RegisterCoordinator(CoordinatorProfile profile)
    {
        _state.State.Coordinators[profile.UserId] = profile;
        await _state.WriteStateAsync();
        _logger.LogInformation("Registered coordinator {CoordinatorId}", profile.UserId);
    }

    public Task<List<CoordinatorProfile>> GetCoordinators()
    {
        return Task.FromResult(_state.State.Coordinators.Values.ToList());
    }

    public async Task RemoveCoordinator(Guid coordinatorId)
    {
        if (_state.State.Coordinators.Remove(coordinatorId))
        {
            await _state.WriteStateAsync();
            _logger.LogInformation("Removed coordinator {CoordinatorId}", coordinatorId);
        }
    }

    public async Task RemoveUser(Guid userId)
    {
        if (_state.State.Users.Remove(userId))
        {
            await _state.WriteStateAsync();
            _logger.LogInformation("Removed user {UserId}", userId);
        }
    }
}
