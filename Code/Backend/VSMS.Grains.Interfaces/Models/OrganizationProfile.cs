using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
[Alias("VSMS.Grains.Interfaces.Models.OrganizationProfile")]
public record OrganizationProfile(
    [property: Id(0)] Guid OrganizationId,
    [property: Id(1)] string Name,
    [property: Id(2)] string ContactEmail,
    [property: Id(3)] string Description,
    [property: Id(4)] string? LogoUrl,
    [property: Id(5)] string? Website,
    [property: Id(6)] Location? Location,
    [property: Id(7)] string? VerificationProof,
    [property: Id(8)] bool IsVerified,
    [property: Id(9)] string? CalendarSyncUrl,
    [property: Id(10)] bool IsActive = true
);