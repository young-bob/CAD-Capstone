using VSMS.Grains.Interfaces;
using VSMS.Grains.States;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class EmailIndexGrain : Grain, IEmailIndexGrain
{
    private readonly IPersistentState<EmailIndexState> _state;

    public EmailIndexGrain(
        [PersistentState("email-index", "grain-store")] IPersistentState<EmailIndexState> state)
    {
        _state = state;
    }

    public async Task RegisterEmail(Guid userId)
    {
        _state.State.UserId = userId;
        await _state.WriteStateAsync();
    }

    public Task<Guid?> GetUserIdByEmail()
    {
        return Task.FromResult(_state.State.UserId);
    }

    public async Task RemoveEmail()
    {
        _state.State.UserId = null;
        await _state.WriteStateAsync();
    }
}
