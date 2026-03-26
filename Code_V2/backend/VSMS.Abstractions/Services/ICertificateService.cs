namespace VSMS.Abstractions.Services;

public static class CertificateTemplateTypes
{
    public const string AchievementCertificate = "achievement_certificate";
    public const string HoursLog = "hours_log";
}

public class CertificateActivity
{
    public string Title { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public double Hours { get; set; }
}

public class CertificateData
{
    public string VolunteerName { get; set; } = string.Empty;
    public double TotalHours { get; set; }
    public int CompletedOpportunities { get; set; }
    public string? OrganizationName { get; set; }
    public List<CertificateActivity> Activities { get; set; } = [];
}

public class CertificateTemplateInfo
{
    public string Name { get; set; } = string.Empty;
    public string TemplateType { get; set; } = CertificateTemplateTypes.AchievementCertificate;
    public string PrimaryColor { get; set; } = "#1A237E";
    public string AccentColor { get; set; } = "#C5A23E";
    public string? TitleText { get; set; }
    public string? BodyTemplate { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryTitle { get; set; }
    public byte[]? LogoBytes { get; set; }
    public byte[]? BackgroundBytes { get; set; }
}

public interface ICertificateService
{
    /// <summary>
    /// Generates a PDF certificate and returns the raw bytes.
    /// </summary>
    Task<byte[]> GeneratePdfAsync(CertificateData data, CertificateTemplateInfo template);
}
