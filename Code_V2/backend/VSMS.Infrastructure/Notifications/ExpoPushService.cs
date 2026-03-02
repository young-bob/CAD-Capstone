using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Notifications;

/// <summary>
/// Sends push notifications via the Expo Push API.
/// See: https://docs.expo.dev/push-notifications/sending-notifications/
/// </summary>
public class ExpoPushService : IRealTimePushService, IDisposable
{
    private readonly HttpClient _http;
    private readonly ILogger<ExpoPushService> _logger;

    public ExpoPushService(ILogger<ExpoPushService> logger)
    {
        _logger = logger;
        _http = new HttpClient
        {
            BaseAddress = new Uri("https://exp.host")
        };
        _http.DefaultRequestHeaders.Add("Accept", "application/json");
        _http.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate");
    }

    /// <summary>
    /// Send a push notification to a single Expo push token.
    /// The <paramref name="userId"/> is not used directly; the caller should pass
    /// the Expo push token as <paramref name="eventName"/> with the message body as <paramref name="data"/>.
    /// 
    /// In practice, NotificationGrain resolves the token from VolunteerGrain and calls this.
    /// </summary>
    public async Task PushToUserAsync(Guid userId, string eventName, object data)
    {
        // eventName holds the Expo push token (ExponentPushToken[...])
        // data holds the notification payload
        if (string.IsNullOrEmpty(eventName) || !eventName.StartsWith("ExponentPushToken"))
        {
            _logger.LogWarning("Invalid Expo push token for user {UserId}: {Token}", userId, eventName);
            return;
        }

        var payload = new ExpoPushMessage
        {
            To = eventName,
            Title = "VSMS",
            Body = data?.ToString() ?? "You have a new notification",
            Sound = "default"
        };

        try
        {
            var response = await _http.PostAsJsonAsync("/--/api/v2/push/send", payload);
            var result = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Expo push sent to {UserId}: {Status} {Result}",
                userId, response.StatusCode, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Expo push to user {UserId}", userId);
        }
    }

    public async Task PushToGroupAsync(string groupId, string eventName, object data)
    {
        // For bulk sends, eventName contains comma-separated tokens
        _logger.LogInformation("Expo bulk push to group {GroupId}: {Event}", groupId, eventName);
    }

    public void Dispose() => _http.Dispose();
}

public class ExpoPushMessage
{
    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    [JsonPropertyName("sound")]
    public string? Sound { get; set; }

    [JsonPropertyName("data")]
    public object? Data { get; set; }
}
