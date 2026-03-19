using VSMS.Abstractions.Enums;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class OrganizationReadModel
{
    public Guid OrgId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public OrgStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OpportunityReadModel
{
    public Guid OpportunityId { get; set; }
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public OpportunityStatus Status { get; set; }
    public DateTime PublishDate { get; set; }
    public int TotalSpots { get; set; }
    public int AvailableSpots { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<Guid> RequiredSkillIds { get; set; } = [];
}

public class ApplicationReadModel
{
    public Guid ApplicationId { get; set; }
    public Guid OpportunityId { get; set; }
    public Guid ShiftId { get; set; }
    public string OpportunityTitle { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public DateTime ShiftStartTime { get; set; }
    public DateTime ShiftEndTime { get; set; }
    public Guid VolunteerId { get; set; }
    public string VolunteerName { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; }
    public DateTime AppliedAt { get; set; }
}

public class AttendanceReadModel
{
    public Guid AttendanceId { get; set; }
    public Guid OpportunityId { get; set; }
    public Guid VolunteerId { get; set; }
    public string VolunteerName { get; set; } = string.Empty;
    public string OpportunityTitle { get; set; } = string.Empty;
    public AttendanceStatus Status { get; set; }
    public DateTime? ShiftStartTime { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public double TotalHours { get; set; }
}

public class DisputeReadModel
{
    public Guid AttendanceId { get; set; }
    public Guid VolunteerId { get; set; }
    public string VolunteerName { get; set; } = string.Empty;
    public string OpportunityTitle { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string EvidenceUrl { get; set; } = string.Empty;
    public DateTime RaisedAt { get; set; }
}

public class SkillEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class CertificateTemplateEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string? LogoFileKey { get; set; }
    public string? BackgroundFileKey { get; set; }
    public string PrimaryColor { get; set; } = "#1A237E";
    public string AccentColor { get; set; } = "#C5A23E";
    public string? TitleText { get; set; }
    public string? BodyTemplate { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryTitle { get; set; }
    public bool IsActive { get; set; } = true;
}
