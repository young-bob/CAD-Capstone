namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Read-side link table: records which volunteers are following which organizations.
/// Updated directly by the follow/unfollow endpoints (not event-driven).
/// Enables coordinator "talent pool" queries without activating volunteer grains.
/// </summary>
public class VolunteerFollowEntity
{
    /// <summary>VolunteerGrain primary key — matches ApplicationReadModel.VolunteerId.</summary>
    public Guid VolunteerGrainId { get; set; }

    /// <summary>Organization grain ID.</summary>
    public Guid OrgId { get; set; }

    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;
}
