using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record OrganizationProfile(
    Guid OrganizationId,
    string Name,
    string ContactEmail,
    string Description,
    string? LogoUrl,
    string? Website,
    Location? Location,
    string? VerificationProof,
    bool IsVerified,
<<<<<<< HEAD
    string? CalendarSyncUrl
=======
    string CalendarSyncUrl,
    bool IsActive = true
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
);
