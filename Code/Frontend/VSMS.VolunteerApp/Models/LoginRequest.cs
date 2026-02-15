namespace VSMS.VolunteerApp.Models;

public record LoginRequest(
    string? Email,
    string? Password
);
