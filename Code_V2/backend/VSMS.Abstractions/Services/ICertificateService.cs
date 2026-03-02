namespace VSMS.Abstractions.Services;

public class CertificateData
{
    public string VolunteerName { get; set; } = string.Empty;
    public double TotalHours { get; set; }
    public int CompletedOpportunities { get; set; }
    public string? OrganizationName { get; set; }
}

public class CertificateTemplateInfo
{
    public string Name { get; set; } = string.Empty;
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
