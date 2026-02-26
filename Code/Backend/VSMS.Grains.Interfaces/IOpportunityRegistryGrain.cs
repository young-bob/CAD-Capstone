using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IOpportunityRegistryGrain : IGrainWithStringKey
{
    Task RegisterOpportunity(Guid opportunityId);
    Task UnregisterOpportunity(Guid opportunityId);
    Task<List<Guid>> GetAllOpportunityIds();
}
