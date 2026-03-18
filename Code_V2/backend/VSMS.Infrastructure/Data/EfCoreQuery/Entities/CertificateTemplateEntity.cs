using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Stores certificate templates that can be used to generate volunteer hour certificates.
/// Templates can be system-wide presets or organization-specific custom templates.
/// </summary>
public class CertificateTemplateEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Display name of the template, e.g. "Elegant Gold", "Modern Blue"</summary>
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Brief description of the template style</summary>
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Null = system preset (available to all organizations).
    /// Non-null = custom template owned by a specific organization.
    /// </summary>
    public Guid? OrganizationId { get; set; }

    /// <summary>Organization name (cached for display convenience)</summary>
    [MaxLength(200)]
    public string? OrganizationName { get; set; }

    /// <summary>Optional logo image file key stored in MinIO</summary>
    [MaxLength(500)]
    public string? LogoFileKey { get; set; }

    /// <summary>Optional background image file key stored in MinIO</summary>
    [MaxLength(500)]
    public string? BackgroundFileKey { get; set; }

    /// <summary>Primary color for the certificate design (hex code)</summary>
    [MaxLength(10)]
    public string PrimaryColor { get; set; } = "#1A237E";

    /// <summary>Accent / secondary color (hex code)</summary>
    [MaxLength(10)]
    public string AccentColor { get; set; } = "#C5A23E";

    /// <summary>
    /// Custom title text to show on the certificate.
    /// If null, defaults to "Certificate of Volunteer Service".
    /// </summary>
    [MaxLength(300)]
    public string? TitleText { get; set; }

    /// <summary>
    /// Custom body template text. Supports placeholders:
    /// {{VolunteerName}}, {{TotalHours}}, {{OpportunityCount}}, {{OrganizationName}}, {{Date}}
    /// </summary>
    [MaxLength(2000)]
    public string? BodyTemplate { get; set; }

    /// <summary>
    /// Signatory name displayed at the bottom of the certificate.
    /// </summary>
    [MaxLength(200)]
    public string? SignatoryName { get; set; }

    /// <summary>
    /// Signatory title displayed below the signatory name.
    /// </summary>
    [MaxLength(200)]
    public string? SignatoryTitle { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
