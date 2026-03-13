using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class RegistryState
{
    [Id(0)]
    public Dictionary<Guid, OrganizationProfile> Organizations { get; set; } = new();

    [Id(1)]
    public Dictionary<Guid, VolunteerProfile> Volunteers { get; set; } = new();

    [Id(2)]
    public Dictionary<Guid, CoordinatorProfile> Coordinators { get; set; } = new();

    [Id(3)]
    public Dictionary<Guid, User> Users { get; set; } = new();
}
