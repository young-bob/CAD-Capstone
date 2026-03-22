using Orleans;
using Orleans.Concurrency;

namespace VSMS.Abstractions.Grains;

public interface IVolunteerGrain : IGrainWithGuidKey
{
    // Profile
    [AlwaysInterleave]
    Task<States.VolunteerState> GetProfile();
    Task UpdateProfile(string firstName, string lastName, string email, string phone, string bio);
    Task UpdatePrivacySettings(bool isProfilePublic, bool allowEmail, bool allowPush);
    Task UploadCredential(string credentialUrl);

    // Applications tracking
    Task AddApplicationId(Guid applicationId);
    Task RemoveApplicationId(Guid applicationId);
    Task<List<Guid>> GetApplications();

    // Stats
    Task AddCompletedHours(double hours);
    Task IncrementCompletedOpportunities();
    Task<bool> IsBlockedByOrg(Guid orgId);

    // Feedback
    Task SubmitFeedback(Guid opportunityId, int rating, string comment);

    // Push Notifications
    Task RegisterPushToken(string expoPushToken);
    [AlwaysInterleave]
    Task<string?> GetPushToken();

    // Skills
    Task AddSkill(Guid skillId);
    Task RemoveSkill(Guid skillId);
    [AlwaysInterleave]
    Task<List<Guid>> GetSkillIds();

    // Compliance
    Task SetBackgroundCheckStatus(string status);
    Task SignWaiver();

    // Org following
    Task FollowOrg(Guid orgId);
    Task UnfollowOrg(Guid orgId);
}
