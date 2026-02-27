namespace VSMS.VolunteerApp.Models;

public record CertificateDetails(
    Guid Id,
    Guid VolunteerId,
    string? VolunteerName,
    bool IsSigned,
    string? CoordinatorSignature,
    DateTime? IssuedAt
);
