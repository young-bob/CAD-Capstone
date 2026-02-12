using VSMS.Grains.Interfaces.Enums;
using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record AttendanceRecord(
    Guid RecordId,
    Guid VolunteerId,
    Guid OpportunityId,
    DateTime TimeIn,
    DateTime? TimeOut,
    double TotalHours,
    AttendanceMethod CheckInMethod,
    AttendanceStatus Status
);
