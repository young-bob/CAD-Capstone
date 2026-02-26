using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class OrganizationManagerState
{
    [Id(0)]
    public OrganizationManagerProfile? Profile { get; set; }
}
