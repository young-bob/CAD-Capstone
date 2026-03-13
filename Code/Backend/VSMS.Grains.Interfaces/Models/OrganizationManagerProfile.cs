namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record OrganizationManagerProfile(
    Guid UserId,
    string Email,
    Guid OrganizationId
);
