using Orleans;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record Shift
{
    [Id(0)] public Guid ShiftId { get; init; } = Guid.NewGuid();
    [Id(1)] public string Name { get; init; } = string.Empty;
    [Id(2)] public DateTime StartTime { get; init; }
    [Id(3)] public DateTime EndTime { get; init; }
    [Id(4)] public int MaxCapacity { get; init; }
    [Id(5)] public int CurrentCount { get; set; }
}
