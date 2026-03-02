namespace VSMS.Abstractions.Services;

public interface IRealTimePushService
{
    Task PushToUserAsync(Guid userId, string eventName, object data);
    Task PushToGroupAsync(string groupId, string eventName, object data);
}
