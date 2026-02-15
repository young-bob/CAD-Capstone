namespace VSMS.VolunteerApp.Models;

public record UserInfo(
    Guid UserId,
    string? Name,
    string? Email,
    string? Role
);
