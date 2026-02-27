using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IOpportunityGrain : IGrainWithGuidKey
{
    Task UpdateDetails(OpportunityDetails details);
    Task<OpportunityDetails?> GetDetails();

    Task<Application> SubmitApplication(Guid volunteerId, string notes);
    Task ProcessApplication(Guid applicationId, ApplicationStatus status, string? rejectionReason = null);

    Task<List<Application>> GetApplications();
    Task<List<Application>> GetEnrollments();
    Task DeleteOpportunity();
}
