using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.States;

namespace VSMS.Abstractions.Grains;

public interface IOrganizationGrain : IGrainWithGuidKey
{
    Task Initialize(string name, string description, Guid creatorUserId, string creatorEmail, string? proofUrl = null);
    Task<Guid> CreateOpportunity(string title, string description, string category);
    Task InviteMember(string email, OrgRole role);
    Task AddCoordinator(Guid userId, string email);
    Task RemoveCoordinator(Guid userId);
    Task BlockVolunteer(Guid volunteerId);
    Task UnblockVolunteer(Guid volunteerId);
    Task<bool> IsVolunteerBlocked(Guid volunteerId);
    Task SetStatus(OrgStatus status);
    Task<List<Guid>> GetOpportunities();
    Task<OrganizationState> GetState();
    Task UpdateInfo(string name, string description);
    Task Resubmit(string name, string description, string? proofUrl);
    Task UpdateProfile(string? websiteUrl, string? contactEmail, List<string> tags);
    Task PostAnnouncement(string text);
    Task<List<OrgAnnouncement>> GetAnnouncements();
}
