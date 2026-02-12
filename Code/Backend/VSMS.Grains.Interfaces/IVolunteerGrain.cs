using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IVolunteerGrain : IGrainWithGuidKey
{
    Task UpdateProfile(VolunteerProfile profile);
    Task<VolunteerProfile?> GetProfile();

    Task AddCredential(Credential credential);
    Task<List<Credential>> GetCredentials();

    Task ApplyForOpportunity(Guid opportunityId);

    Task CheckIn(Guid opportunityId, Location location);
    Task CheckOut(Guid opportunityId);

    Task<List<AttendanceRecord>> GetAttendanceHistory();

    // Skill management
    Task AddSkill(Guid skillId);
    Task RemoveSkill(Guid skillId);
    Task<List<Guid>> GetSkills();

    // Certificate management
    Task<List<Guid>> GetCertificates();
}
