using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class OpportunityState
{
    [Id(0)]
    public OpportunityDetails? Details { get; set; }

    [Id(1)]
    public List<Application> Applications { get; set; } = new();
}
