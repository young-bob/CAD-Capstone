using Orleans;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains.Interfaces;

public interface ICoordinatorGrain : IGrainWithGuidKey
{
    Task SetOrganization(string organizationId);
    Task UpdateProfile(CoordinatorProfile profile);
    Task<CoordinatorProfile?> GetProfile();
    Task CreateShift(Guid opportunityId);
    Task ValidateAttendance(Guid volunteerId, Guid opportunityId);
}
