using VSMS.Grains.Interfaces.Enums;
using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record OpportunityDetails(
    Guid OpportunityId,
    Guid OrganizationId,
    string Title,
    string Description,
    OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers,
    int RegisteredCount,
    List<Guid>? RequiredSkillIds = null
);
