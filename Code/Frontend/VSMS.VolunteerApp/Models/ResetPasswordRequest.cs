namespace VSMS.VolunteerApp.Models;

public record ResetPasswordRequest(
    string? OldPassword,
    string? NewPassword
);
