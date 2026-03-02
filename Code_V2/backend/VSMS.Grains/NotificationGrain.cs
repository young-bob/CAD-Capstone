using Microsoft.Extensions.Logging;
using Orleans;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Grains;

public class NotificationGrain(
    ILogger<NotificationGrain> logger,
    IGrainFactory grainFactory,
    IRealTimePushService pushService) : Grain, INotificationGrain
{
    public async Task SendNotification(Guid userId, string type, string payload)
    {
        logger.LogInformation("[Notification] To={UserId} Type={Type} Payload={Payload}", userId, type, payload);

        // Look up the volunteer's Expo push token
        var volunteer = grainFactory.GetGrain<IVolunteerGrain>(userId);
        var token = await volunteer.GetPushToken();

        if (!string.IsNullOrEmpty(token))
        {
            await pushService.PushToUserAsync(userId, token, $"{type}: {payload}");
        }
        else
        {
            logger.LogDebug("No push token registered for user {UserId}, skipping push", userId);
        }
    }

    public async Task SendBulkNotification(List<Guid> userIds, string type, string payload)
    {
        logger.LogInformation("[Notification] Bulk to {Count} users, Type={Type}", userIds.Count, type);

        foreach (var userId in userIds)
        {
            await SendNotification(userId, type, payload);
        }
    }

    public Task MarkAsRead(Guid notificationId)
    {
        logger.LogInformation("[Notification] Marked as read: {NotificationId}", notificationId);
        return Task.CompletedTask;
    }
}
