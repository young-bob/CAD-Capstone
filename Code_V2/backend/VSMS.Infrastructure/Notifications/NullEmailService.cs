using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Notifications;

public class NullEmailService(ILogger<NullEmailService> logger) : IEmailService
{
    public Task SendAsync(string to, string subject, string body)
    {
        logger.LogInformation("[Stub] Email to {To}: {Subject}", to, subject);
        return Task.CompletedTask;
    }

    public Task SendTemplateAsync(string to, string templateId, Dictionary<string, string> data)
    {
        logger.LogInformation("[Stub] Template email to {To}: template={TemplateId}", to, templateId);
        return Task.CompletedTask;
    }
}
