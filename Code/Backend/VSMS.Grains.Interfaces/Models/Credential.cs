using VSMS.Grains.Interfaces.Enums;
using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record Credential(
    Guid CredId,
    Guid VolunteerId,
    CredentialType Type,
    string FileUrl,
    DateTime ExpirationDate,
    bool IsVerified
);
