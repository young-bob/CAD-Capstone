namespace VSMS.VolunteerApp.Models;

public record RegisterRequest(
    string? Name,
    string? Email,
    string? Password,
    string? Role,
    string? PhoneNumber,
    string? Bio,
    Location? Location
);
