using Orleans;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record AuditLog
{
    [Id(0)] public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    [Id(1)] public Guid OperatorId { get; init; }
    [Id(2)] public string Action { get; init; } = string.Empty;
    [Id(3)] public string Reason { get; init; } = string.Empty;
}
