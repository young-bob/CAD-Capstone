namespace VSMS.VolunteerApp.Models;

public record VolunteerProfile(
    Guid UserId,
    string? Name,
    string? Email,
    string? PhoneNumber,
    string? Bio,
    double TotalHours,
    Location? CurrentLocation,
    List<Guid>? SkillIds
);
