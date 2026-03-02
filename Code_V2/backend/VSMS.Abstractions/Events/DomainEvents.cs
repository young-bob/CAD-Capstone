using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.Events;

public record OrganizationCreatedEvent(Guid OrgId, string Name, string Description, OrgStatus Status, DateTime CreatedAt);
public record OrganizationStatusChangedEvent(Guid OrgId, OrgStatus Status);

public record OpportunityCreatedEvent(Guid OpportunityId, Guid OrganizationId, string Title, string Category, OpportunityStatus Status, DateTime PublishDate, int TotalSpots, double? Latitude = null, double? Longitude = null);
public record OpportunityStatusChangedEvent(Guid OpportunityId, OpportunityStatus Status);
public record OpportunitySpotsUpdatedEvent(Guid OpportunityId, int AvailableSpots, int TotalSpots);
/// <summary>Published when a Coordinator sets which skills an opportunity requires.</summary>
public record OpportunitySkillsUpdatedEvent(Guid OpportunityId, List<Guid> RequiredSkillIds);

public record ApplicationSubmittedEvent(Guid ApplicationId, Guid OpportunityId, Guid ShiftId, string OpportunityTitle, string ShiftName, DateTime ShiftStartTime, DateTime ShiftEndTime, Guid VolunteerId, string VolunteerName, ApplicationStatus Status, DateTime AppliedAt);
public record ApplicationStatusChangedEvent(Guid ApplicationId, ApplicationStatus Status);

public record AttendanceRecordedEvent(Guid AttendanceId, Guid OpportunityId, Guid VolunteerId, string VolunteerName, string OpportunityTitle, AttendanceStatus Status, DateTime? CheckInTime, DateTime? CheckOutTime, double TotalHours);
public record AttendanceStatusChangedEvent(Guid AttendanceId, AttendanceStatus Status, DateTime? CheckOutTime, double TotalHours);

public record DisputeRaisedEvent(Guid AttendanceId, Guid VolunteerId, string VolunteerName, string OpportunityTitle, string Reason, string EvidenceUrl, DateTime RaisedAt);
public record DisputeResolvedEvent(Guid AttendanceId, AttendanceStatus RecordStatus);

public record UserBannedEvent(Guid UserId);
public record UserUnbannedEvent(Guid UserId);
