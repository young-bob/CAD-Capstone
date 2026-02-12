using VSMS.Grains.Interfaces;
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
