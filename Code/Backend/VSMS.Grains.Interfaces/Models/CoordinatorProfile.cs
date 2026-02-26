using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record CoordinatorProfile(
    Guid UserId,
    string Name,
    string Email,
    Guid OrganizationId,
    string JobTitle
);
