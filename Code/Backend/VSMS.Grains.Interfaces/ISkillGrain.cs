using Orleans;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains.Interfaces;

public interface ISkillGrain : IGrainWithGuidKey
{
    Task UpdateDetails(Skill skill);
    Task<Skill?> GetDetails();

    Task<List<Guid>> GetVolunteersWithSkill();
    Task<List<Guid>> GetOpportunitiesRequiringSkill();

    Task AddVolunteer(Guid volunteerId);
    Task RemoveVolunteer(Guid volunteerId);
    Task AddOpportunity(Guid opportunityId);
}
