namespace VSMS.VolunteerApp.Models;

public record OpportunityDetails(
    Guid Id,
    Guid OrganizationId,
    string? Title,
    string? Description,
    OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location? VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers,
    int RegisteredCount
);
