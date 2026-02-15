namespace VSMS.VolunteerApp.Models;

public record VerifyCredentialRequest(
    Guid VolunteerId,
    Guid CredentialId
);
