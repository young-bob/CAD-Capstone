using System;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.DTOs;

public record AttendanceSummary(
    Guid AttendanceId,
    Guid OpportunityId,
    Guid VolunteerId,
    string VolunteerName,
    string OpportunityTitle,
    AttendanceStatus Status,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    double TotalHours
);
