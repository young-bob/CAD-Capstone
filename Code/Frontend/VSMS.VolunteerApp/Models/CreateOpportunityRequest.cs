namespace VSMS.VolunteerApp.Models;

public record CreateOpportunityRequest(
    Guid OrganizationId,
    string? Title,
    string? Description,
    OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location? VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers
);
