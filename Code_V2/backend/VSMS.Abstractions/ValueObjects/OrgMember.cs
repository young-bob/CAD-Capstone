using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record OrgMember
{
    [Id(0)] public Guid UserId { get; init; }
    [Id(1)] public string Email { get; init; } = string.Empty;
    [Id(2)] public OrgRole Role { get; init; }
    [Id(3)] public DateTime JoinedAt { get; init; } = DateTime.UtcNow;
}
