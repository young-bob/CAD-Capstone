using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class OpportunityRegistryState
{
    [Id(0)]
    public List<Guid> OpportunityIds { get; set; } = new();
}
