using System;

namespace VSMS.Abstractions.DTOs;

public record DisputeSummary(
    Guid AttendanceId,
    Guid VolunteerId,
    string VolunteerName,
    string OpportunityTitle,
    string Reason,
    string EvidenceUrl,
    DateTime RaisedAt
);
