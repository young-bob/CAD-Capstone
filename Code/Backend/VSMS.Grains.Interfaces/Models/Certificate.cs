using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record Certificate(
    Guid CertId,
    string CoordinatorSignature,
    DateTime IssueDate,
    string FileUrl,
    Guid VolunteerId,
    List<Guid> AttendanceRecordIds
);
