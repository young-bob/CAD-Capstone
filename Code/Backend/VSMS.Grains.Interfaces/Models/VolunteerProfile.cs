using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record VolunteerProfile(
    Guid UserId,
    string Name,
    string Email,
    string PhoneNumber,
    string Bio,
    double TotalHours,
    Location CurrentLocation,
    List<Guid> SkillIds
);
