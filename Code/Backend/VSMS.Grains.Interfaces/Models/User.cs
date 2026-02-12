using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record User(
    Guid UserId,
    string Email,
    string PasswordHash,
    string Role,          // "Volunteer" or "Coordinator"
    DateTime CreatedAt,
    DateTime? LastLoginAt,
    bool IsActive
);
