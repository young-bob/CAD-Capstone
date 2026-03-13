using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IRegistryGrain : IGrainWithIntegerKey
{
    Task RegisterOrganization(OrganizationProfile profile);
    Task RegisterVolunteer(VolunteerProfile profile);
    Task RegisterCoordinator(CoordinatorProfile profile);
    Task RegisterUser(User user);

    Task<List<OrganizationProfile>> GetOrganizations();
    Task<List<VolunteerProfile>> GetVolunteers();
    Task<List<CoordinatorProfile>> GetCoordinators();
    Task<List<User>> GetUsers();

    Task RemoveOrganization(Guid organizationId);
    Task RemoveVolunteer(Guid volunteerId);
    Task RemoveCoordinator(Guid coordinatorId);
    Task RemoveUser(Guid userId);
}
