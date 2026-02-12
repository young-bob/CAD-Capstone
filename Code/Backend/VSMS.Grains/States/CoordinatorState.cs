using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class CoordinatorState
{
    [Id(0)]
    public string OrganizationId { get; set; } = string.Empty;

    [Id(1)]
    public string JobTitle { get; set; } = string.Empty;
}
