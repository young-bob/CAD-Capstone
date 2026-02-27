using VSMS.Grains.Interfaces;
using VSMS.Grains.States;
using Orleans.Runtime;

namespace VSMS.Grains;

public class OpportunityRegistryGrain : Grain, IOpportunityRegistryGrain
{
    private readonly IPersistentState<OpportunityRegistryState> _state;

    public OpportunityRegistryGrain(
        [PersistentState("opportunity-registry", "grain-store")] IPersistentState<OpportunityRegistryState> state)
    {
        _state = state;
    }

    public async Task RegisterOpportunity(Guid opportunityId)
    {
        if (!_state.State.OpportunityIds.Contains(opportunityId))
        {
            _state.State.OpportunityIds.Add(opportunityId);
            await _state.WriteStateAsync();
        }
    }

    public async Task UnregisterOpportunity(Guid opportunityId)
    {
        if (_state.State.OpportunityIds.Remove(opportunityId))
        {
            await _state.WriteStateAsync();
        }
    }

    public Task<List<Guid>> GetAllOpportunityIds()
    {
        return Task.FromResult(_state.State.OpportunityIds);
    }
}
