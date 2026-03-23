namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Persisted notification record — written when a coordinator sends a message to volunteers.
/// Enables the web portal notification inbox (in-app bell icon + list).
/// </summary>
public class NotificationEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Recipient volunteer grain ID.</summary>
    public Guid VolunteerGrainId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional display name of the sender (org/coordinator name).</summary>
    public string? SenderName { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; } = false;
}
