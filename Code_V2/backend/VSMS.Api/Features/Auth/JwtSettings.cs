namespace VSMS.Api.Features.Auth;

public class JwtSettings
{
    public string Secret { get; set; } = "VSMS-Super-Secret-Key-Change-In-Production-Min32Chars!";
    public string Issuer { get; set; } = "VSMS.Api";
    public string Audience { get; set; } = "VSMS.Client";
    public int ExpirationMinutes { get; set; } = 60;
}
