using Orleans;

namespace VSMS.Grains.Interfaces;

public interface ICoordinatorGrain : IGrainWithGuidKey
{
    Task SetOrganization(string organizationId);
    Task<string?> GetOrganizationId();
    Task CreateShift(Guid opportunityId);
    Task ValidateAttendance(Guid volunteerId, Guid opportunityId);
}
