using Orleans;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains.Interfaces;

public interface ICoordinatorGrain : IGrainWithGuidKey
{
    Task SetOrganization(string organizationId);
<<<<<<< HEAD
    Task<string?> GetOrganizationId();
=======
    Task UpdateProfile(CoordinatorProfile profile);
    Task<CoordinatorProfile?> GetProfile();
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
    Task CreateShift(Guid opportunityId);
    Task ValidateAttendance(Guid volunteerId, Guid opportunityId);
}
