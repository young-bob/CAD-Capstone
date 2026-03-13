using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class OrganizationState
{
    [Id(0)]
    public OrganizationProfile? Profile { get; set; }

    [Id(1)]
    public List<Guid> PublishedOpportunities { get; set; } = new();

    [Id(2)]
    public Dictionary<Guid, List<Guid>> VerifiedCredentials { get; set; } = new();

    [Id(3)]
    public Dictionary<Guid, DateTime> PendingVolunteerApplications { get; set; } = new();
}
