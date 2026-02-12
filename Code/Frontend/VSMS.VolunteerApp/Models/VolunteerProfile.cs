namespace VSMS.VolunteerApp.Models;

public record VolunteerProfile(
    string Email,
    string PhoneNumber,
    string Bio,
    double TotalHours,
    Location CurrentLocation,
    List<string> Skills // Changed from List<int> SkillIds to List<string> for UI simplicity for now, or keep int if we have skills lookup
);
