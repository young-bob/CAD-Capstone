using System;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.DTOs;

public record ApplicationSummary(
    Guid ApplicationId,
    Guid OpportunityId,
    Guid ShiftId,
    string OpportunityTitle,
    string ShiftName,
    DateTime ShiftStartTime,
    DateTime ShiftEndTime,
    Guid VolunteerId,
    string VolunteerName,
    ApplicationStatus Status,
    DateTime AppliedAt,
    string? AttendanceStatus = null // null = no check-in record yet; values match AttendanceStatus enum names
);
