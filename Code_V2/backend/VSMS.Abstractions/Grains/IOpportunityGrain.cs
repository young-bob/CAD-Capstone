using Orleans;
using Orleans.Concurrency;

namespace VSMS.Abstractions.Grains;

public interface IOpportunityGrain : IGrainWithGuidKey
{
    // Lifecycle
    Task Initialize(Guid organizationId, string title, string description, string category);
    Task Publish();
    Task Cancel(string reason);

    // Applications
    Task<Guid> SubmitApplication(Guid volunteerId, Guid shiftId, string idempotencyKey);
    Task WithdrawApplication(Guid applicationId);
    Task TryPromoteFromWaitlist(Guid shiftId);

    // GeoFence
    Task<bool> ValidateGeoLocation(double lat, double lon);

    // Shifts
    Task AddShift(string name, DateTime startTime, DateTime endTime, int maxCapacity);

    // Skills
    Task SetRequiredSkills(List<Guid> skillIds);

    // Queries
    [AlwaysInterleave]
    Task<States.OpportunityState> GetState();
}
