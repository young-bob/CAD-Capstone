using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.Grains;

public interface IOrganizationGrain : IGrainWithGuidKey
{
    Task Initialize(string name, string description, Guid creatorUserId, string creatorEmail);
    Task<Guid> CreateOpportunity(string title, string description, string category);
    Task InviteMember(string email, OrgRole role);
    Task BlockVolunteer(Guid volunteerId);
    Task UnblockVolunteer(Guid volunteerId);
    Task<bool> IsVolunteerBlocked(Guid volunteerId);
    Task SetStatus(OrgStatus status);
    Task<List<Guid>> GetOpportunities();
    Task<States.OrganizationState> GetState();
    Task UpdateInfo(string name, string description);
}
