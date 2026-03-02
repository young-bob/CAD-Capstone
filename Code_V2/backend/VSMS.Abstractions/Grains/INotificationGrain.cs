using Orleans;

namespace VSMS.Abstractions.Grains;

public interface INotificationGrain : IGrainWithGuidKey
{
    Task SendNotification(Guid userId, string type, string payload);
    Task SendBulkNotification(List<Guid> userIds, string type, string payload);
    Task MarkAsRead(Guid notificationId);
}
