using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class VolunteerState
{
    [Id(0)]
    public VolunteerProfile? Profile { get; set; } = null;

    [Id(1)]
    public List<Credential> Credentials { get; set; } = new();

    [Id(2)]
    public List<Application> Applications { get; set; } = new();

    [Id(3)]
    public List<AttendanceRecord> AttendanceHistory { get; set; } = new();

    [Id(4)]
    public List<Guid> SkillIds { get; set; } = new();

    [Id(5)]
    public List<Guid> CertificateIds { get; set; } = new();
}
