using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class OrganizationGrain : Grain, IOrganizationGrain
{
    private readonly IPersistentState<OrganizationState> _state;

    public OrganizationGrain([PersistentState("organization", "grain-store")] IPersistentState<OrganizationState> state)
    {
        _state = state;
    }

    public async Task UpdateProfile(OrganizationProfile profile)
    {
        _state.State.Profile = profile;
        await _state.WriteStateAsync();
    }

    public Task<OrganizationProfile> GetProfile()
    {
        return Task.FromResult(_state.State.Profile ?? new OrganizationProfile(
            Guid.Empty,    // OrganizationId
            string.Empty,  // Name
            string.Empty,  // Description
            string.Empty,  // LogoUrl
            string.Empty,  // Website
            new Location(0, 0, "", "", "", ""),  // Location
            string.Empty,  // VerificationProof
            false,         // IsVerified
            string.Empty   // CalendarSyncUrl
        ));
    }

    public async Task VerifyCredential(Guid volunteerId, Guid credentialId)
    {
        // Mark credential as verified
        if (!_state.State.VerifiedCredentials.ContainsKey(volunteerId))
        {
            _state.State.VerifiedCredentials[volunteerId] = new List<Guid>();
        }

        if (!_state.State.VerifiedCredentials[volunteerId].Contains(credentialId))
        {
            _state.State.VerifiedCredentials[volunteerId].Add(credentialId);
            await _state.WriteStateAsync();
        }
    }

    public async Task PublishOpportunity(Guid opportunityId)
    {
        if (!_state.State.PublishedOpportunities.Contains(opportunityId))
        {
            _state.State.PublishedOpportunities.Add(opportunityId);
            await _state.WriteStateAsync();
        }
    }

    public Task<List<Guid>> GetPublishedOpportunities()
    {
        return Task.FromResult(_state.State.PublishedOpportunities);
    }
}
