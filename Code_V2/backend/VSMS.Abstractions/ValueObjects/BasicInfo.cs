using Orleans;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record BasicInfo
{
    [Id(0)] public string Title { get; init; } = string.Empty;
    [Id(1)] public string Description { get; init; } = string.Empty;
    [Id(2)] public string Category { get; init; } = string.Empty;
    [Id(3)] public List<string> Tags { get; init; } = [];
}
