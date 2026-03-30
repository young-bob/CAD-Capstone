using Orleans;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class VolunteerState
{
    [Id(0)] public string FirstName { get; set; } = string.Empty;
    [Id(1)] public string LastName { get; set; } = string.Empty;
    [Id(2)] public string Email { get; set; } = string.Empty;
    [Id(3)] public string Phone { get; set; } = string.Empty;
    [Id(4)] public string Bio { get; set; } = string.Empty;
    [Id(5)] public bool IsProfilePublic { get; set; } = true;
    [Id(6)] public bool AllowEmailNotifications { get; set; } = true;
    [Id(7)] public bool AllowPushNotifications { get; set; } = true;
    [Id(8)] public double ImpactScore { get; set; }
    [Id(9)] public double TotalHours { get; set; }
    [Id(10)] public int CompletedOpportunities { get; set; }
    [Id(11)] public HashSet<Guid> BlockedByOrgIds { get; set; } = [];
    [Id(12)] public List<Guid> SkillIds { get; set; } = [];
    [Id(13)] public List<Guid> ApplicationIds { get; set; } = [];
    [Id(14)] public List<string> Credentials { get; set; } = [];
    [Id(15)] public bool IsInitialized { get; set; }
    [Id(16)] public string? ExpoPushToken { get; set; }
    [Id(17)] public string BackgroundCheckStatus { get; set; } = "NotSubmitted";
    [Id(18)] public DateTime? WaiverSignedAt { get; set; }
    [Id(19)] public HashSet<Guid> FollowedOrgIds { get; set; } = [];
    [Id(20)] public string? LinkedInUrl { get; set; }
    [Id(21)] public bool LinkedInVerified { get; set; }
}
