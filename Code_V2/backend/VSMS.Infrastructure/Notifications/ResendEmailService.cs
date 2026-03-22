using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Notifications;

/// <summary>
/// Sends transactional emails via the Resend HTTP API.
/// Requires RESEND_API env var (or Resend:ApiKey in appsettings).
/// Falls back to logging-only if key is absent.
/// </summary>
public class ResendEmailService(
    string apiKey,
    string fromAddress,
    ILogger<ResendEmailService> logger) : IEmailService
{
    private static readonly HttpClient _http = new();

    public async Task SendAsync(string to, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("[Resend] No API key configured — skipping email to {To}: {Subject}", to, subject);
            return;
        }

        var payload = new
        {
            from = fromAddress,
            to = new[] { to },
            subject,
            html = body,
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _http.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                logger.LogError("[Resend] Failed to send email to {To}: {Status} — {Error}", to, response.StatusCode, err);
            }
            else
            {
                logger.LogInformation("[Resend] Email sent to {To}: {Subject}", to, subject);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Resend] Exception sending email to {To}", to);
        }
    }

    public async Task SendTemplateAsync(string to, string templateId, Dictionary<string, string> data)
    {
        // Resend doesn't have server-side template IDs — build a simple HTML body from the data dict
        var bodyLines = data.Select(kv => $"<p><strong>{kv.Key}:</strong> {kv.Value}</p>");
        var html = $"<div style='font-family:sans-serif'>{string.Join("\n", bodyLines)}</div>";
        await SendAsync(to, templateId, html);
    }
}
