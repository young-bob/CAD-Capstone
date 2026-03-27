using System.ComponentModel.DataAnnotations;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class IssuedCertificateEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(40)]
    public string CertificateId { get; set; } = string.Empty;

    public Guid VolunteerId { get; set; }
    public Guid? OrganizationId { get; set; }
    public Guid TemplateId { get; set; }

    [MaxLength(200)]
    public string VolunteerName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? OrganizationName { get; set; }

    [MaxLength(200)]
    public string TemplateName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string TemplateType { get; set; } = CertificateTemplateTypes.AchievementCertificate;

    public double TotalHours { get; set; }
    public int CompletedOpportunities { get; set; }

    [MaxLength(200)]
    public string? VolunteerSignatureName { get; set; }

    [MaxLength(200)]
    public string? SignatoryName { get; set; }

    [MaxLength(200)]
    public string? SignatoryTitle { get; set; }

    [MaxLength(500)]
    public string? FileKey { get; set; }

    [MaxLength(260)]
    public string? FileName { get; set; }

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
}
