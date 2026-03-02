using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record RecurrenceRule
{
    [Id(0)] public Frequency Type { get; init; }
    [Id(1)] public int Interval { get; init; } = 1;
    [Id(2)] public DateTime? EndDate { get; init; }
}
