namespace VSMS.VolunteerApp.Models;

public record CertificateRequest(
    Guid VolunteerId,
    List<Guid>? AttendanceRecordIds,
    Guid TemplateId
);
