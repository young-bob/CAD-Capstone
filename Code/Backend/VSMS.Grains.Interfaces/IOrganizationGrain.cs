using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IOrganizationGrain : IGrainWithGuidKey
{
    Task UpdateProfile(OrganizationProfile profile);
    Task<OrganizationProfile> GetProfile();

    Task VerifyCredential(Guid volunteerId, Guid credentialId);
    Task PublishOpportunity(Guid opportunityId);

    Task<List<Guid>> GetPublishedOpportunities();
}
