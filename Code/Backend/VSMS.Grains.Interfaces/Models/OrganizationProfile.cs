using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record OrganizationProfile(
    Guid OrganizationId,
    string Name,
    string ContactEmail,
    string Description,
    string LogoUrl,
    string Website,
    Location Location,
    string VerificationProof,
    bool IsVerified,
    string CalendarSyncUrl,
    bool IsActive = true
);
