using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface ISkillGrain : IGrainWithGuidKey
{
    Task UpdateDetails(Skill skill);
    Task<Skill?> GetDetails();
    
    Task<List<Guid>> GetVolunteersWithSkill();
    Task<List<Guid>> GetOpportunitiesRequiringSkill();
}
