using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record DisputeInfo
{
    [Id(0)] public Guid RaisedByVolunteerId { get; init; }
    [Id(1)] public string Reason { get; init; } = string.Empty;
    [Id(2)] public string EvidenceUrl { get; init; } = string.Empty;
    [Id(3)] public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    [Id(4)] public string Resolution { get; set; } = string.Empty;
    [Id(5)] public double? AdjustedHours { get; set; }
    [Id(6)] public DateTime RaisedAt { get; init; } = DateTime.UtcNow;
    [Id(7)] public DateTime? ResolvedAt { get; set; }
}
