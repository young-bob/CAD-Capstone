using Orleans;
using Orleans.Concurrency;

namespace VSMS.Abstractions.Grains;

public interface ICoordinatorGrain : IGrainWithGuidKey
{
    // Profile
    Task Initialize(string firstName, string lastName, string email, string phone, Guid organizationId);
    [AlwaysInterleave]
    Task<States.CoordinatorState> GetProfile();
    Task UpdateProfile(string firstName, string lastName, string phone);

    // Organization binding
    Task SetOrganization(Guid organizationId);
    [AlwaysInterleave]
    Task<Guid?> GetOrganizationId();

    // Push Notifications
    Task RegisterPushToken(string expoPushToken);
    [AlwaysInterleave]
    Task<string?> GetPushToken();

    // Stats
    Task IncrementManagedOpportunities();
}
