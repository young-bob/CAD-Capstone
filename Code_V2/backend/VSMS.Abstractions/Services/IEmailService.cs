namespace VSMS.Abstractions.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body);
    Task SendTemplateAsync(string to, string templateId, Dictionary<string, string> data);
}
