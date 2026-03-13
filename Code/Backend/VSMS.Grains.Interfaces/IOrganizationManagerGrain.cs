using Orleans;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains.Interfaces;

public interface IOrganizationManagerGrain : IGrainWithGuidKey
{
    Task UpdateProfile(OrganizationManagerProfile profile);
    Task<OrganizationManagerProfile?> GetProfile();
    Task SetOrganization(Guid organizationId);
    Task<Guid?> GetOrganizationId();
}
