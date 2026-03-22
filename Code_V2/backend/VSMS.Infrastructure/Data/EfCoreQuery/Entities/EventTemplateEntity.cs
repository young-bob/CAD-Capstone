using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Saved event configuration template for an organization.
/// Stores reusable event setup so coordinators can spin up new events quickly.
/// </summary>
public class EventTemplateEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The organization that owns this template.</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Display name for this template (e.g. "Weekly Bingo Night").</summary>
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // ── Event basic info ──
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(2000)] public string Description { get; set; } = string.Empty;
    [MaxLength(100)] public string Category { get; set; } = string.Empty;

    /// <summary>JSON-serialized string[]. e.g. ["indoor","mobility-friendly"]</summary>
    public string TagsJson { get; set; } = "[]";

    /// <summary>ApprovalPolicy enum value as string.</summary>
    [MaxLength(50)] public string ApprovalPolicy { get; set; } = "ManualApprove";

    /// <summary>JSON-serialized Guid[]. Skill IDs required for this event type.</summary>
    public string RequiredSkillIdsJson { get; set; } = "[]";

    // ── Geofence (optional) ──
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? RadiusMeters { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
