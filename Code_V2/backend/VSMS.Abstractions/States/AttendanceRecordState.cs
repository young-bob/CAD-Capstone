using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.ValueObjects;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class AttendanceRecordState
{
    [Id(0)] public Guid VolunteerId { get; set; }
    [Id(1)] public Guid ApplicationId { get; set; }
    [Id(2)] public Guid OpportunityId { get; set; }
    [Id(3)] public TimeRecord? VerifiedTime { get; set; }
    [Id(4)] public GeoFenceSettings? CheckInSnapshot { get; set; }
    [Id(5)] public AttendanceStatus Status { get; set; } = AttendanceStatus.Pending;
    [Id(6)] public List<AuditLog> Modifications { get; set; } = [];
    [Id(7)] public DisputeInfo? DisputeLog { get; set; }
    [Id(8)] public string ProofPhotoUrl { get; set; } = string.Empty;
    [Id(9)] public int SupervisorRating { get; set; }
}
