namespace VSMS.VolunteerApp.Models;

public record AuthResponse(
    string Token,
    Guid UserId,
    string Email,
    string Role
);
