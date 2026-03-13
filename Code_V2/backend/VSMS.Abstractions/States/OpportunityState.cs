using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.ValueObjects;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class OpportunityState
{
    [Id(0)] public BasicInfo Info { get; set; } = new();
    [Id(1)] public List<Shift> Shifts { get; set; } = [];
    [Id(2)] public RecurrenceRule? Recurrence { get; set; }
    [Id(3)] public GeoFenceSettings? GeoFence { get; set; }
    [Id(4)] public ApprovalPolicy Policy { get; set; } = ApprovalPolicy.ManualApprove;
    [Id(5)] public List<Guid> WaitlistQueue { get; set; } = [];
    [Id(6)] public HashSet<Guid> ConfirmedVolunteerIds { get; set; } = [];
    /// <summary>
    /// Skill IDs required for this opportunity. Matched against VolunteerState.SkillIds.
    /// </summary>
    [Id(7)] public List<Guid> RequiredSkillIds { get; set; } = [];
    [Id(8)] public OpportunityStatus Status { get; set; } = OpportunityStatus.Draft;
    [Id(9)] public Guid OrganizationId { get; set; }
    [Id(10)] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Id(11)] public Dictionary<string, Guid> IdempotencyKeys { get; set; } = new();
}
