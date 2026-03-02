using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.States;

namespace VSMS.Grains;

public class CoordinatorGrain(
    [PersistentState("coordinator", "vsms")] IPersistentState<CoordinatorState> state,
    ILogger<CoordinatorGrain> logger) : Grain, ICoordinatorGrain
{
    public async Task Initialize(string firstName, string lastName, string email, string phone, Guid organizationId)
    {
        state.State.FirstName = firstName;
        state.State.LastName = lastName;
        state.State.Email = email;
        state.State.Phone = phone;
        state.State.OrganizationId = organizationId;
        state.State.IsInitialized = true;
        await state.WriteStateAsync();
        logger.LogInformation("Coordinator {Id} initialized for org {OrgId}", this.GetPrimaryKey(), organizationId);
    }

    public Task<CoordinatorState> GetProfile() => Task.FromResult(state.State);

    public async Task UpdateProfile(string firstName, string lastName, string phone)
    {
        state.State.FirstName = firstName;
        state.State.LastName = lastName;
        state.State.Phone = phone;
        await state.WriteStateAsync();
        logger.LogInformation("Coordinator {Id} profile updated", this.GetPrimaryKey());
    }

    public async Task SetOrganization(Guid organizationId)
    {
        state.State.OrganizationId = organizationId;
        await state.WriteStateAsync();
    }

    public Task<Guid?> GetOrganizationId() => Task.FromResult(state.State.OrganizationId);

    public async Task RegisterPushToken(string expoPushToken)
    {
        state.State.ExpoPushToken = expoPushToken;
        await state.WriteStateAsync();
    }

    public Task<string?> GetPushToken() => Task.FromResult(state.State.ExpoPushToken);

    public async Task IncrementManagedOpportunities()
    {
        state.State.ManagedOpportunities++;
        await state.WriteStateAsync();
    }
}
