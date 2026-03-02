using Orleans;

namespace VSMS.Abstractions.Grains;

public interface IAdminGrain : IGrainWithGuidKey
{
    Task Initialize(Guid userId);
    Task ApproveOrganization(Guid orgId);
    Task RejectOrganization(Guid orgId, string reason);
    Task BanUser(Guid userId);
    Task UnbanUser(Guid userId);
    Task ResolveDispute(Guid attendanceId, string resolution, double adjustedHours);
    Task<States.AdminState> GetState();
}
