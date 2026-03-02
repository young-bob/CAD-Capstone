using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Notifications;

public class NullRealTimePushService(ILogger<NullRealTimePushService> logger) : IRealTimePushService
{
    public Task PushToUserAsync(Guid userId, string eventName, object data)
    {
        logger.LogInformation("[Stub] Push to user {UserId}: {Event}", userId, eventName);
        return Task.CompletedTask;
    }

    public Task PushToGroupAsync(string groupId, string eventName, object data)
    {
        logger.LogInformation("[Stub] Push to group {GroupId}: {Event}", groupId, eventName);
        return Task.CompletedTask;
    }
}
