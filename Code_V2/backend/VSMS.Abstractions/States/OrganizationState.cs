using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.ValueObjects;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class OrganizationState
{
    [Id(0)] public string Name { get; set; } = string.Empty;
    [Id(1)] public string Description { get; set; } = string.Empty;
    [Id(2)] public OrgStatus Status { get; set; } = OrgStatus.PendingApproval;
    [Id(3)] public List<OrgMember> Members { get; set; } = [];
    [Id(4)] public HashSet<Guid> BlockedVolunteerIds { get; set; } = [];
    [Id(5)] public List<Guid> OpportunityIds { get; set; } = [];
    [Id(6)] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Id(7)] public bool IsInitialized { get; set; }
}
