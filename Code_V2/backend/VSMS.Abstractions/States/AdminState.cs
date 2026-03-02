using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.ValueObjects;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class AdminState
{
    [Id(0)] public Guid UserId { get; set; }
    [Id(1)] public AdminRole Role { get; set; } = AdminRole.Moderator;
    [Id(2)] public List<AuditLog> ActionLog { get; set; } = [];
    [Id(3)] public bool IsInitialized { get; set; }
}
