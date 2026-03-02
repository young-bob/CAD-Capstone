using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.Grains;

public interface IApplicationGrain : IGrainWithGuidKey
{
    Task Initialize(Guid volunteerId, Guid opportunityId, Guid shiftId, string idempotencyKey);
    Task Approve();
    Task Reject(string reason);
    Task Waitlist();
    Task Promote();
    Task Withdraw();
    Task MarkAsNoShow();
    Task AcceptInvitation();

    Task<States.ApplicationState> GetState();
}
