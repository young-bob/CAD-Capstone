using Orleans;

namespace VSMS.Grains.Interfaces.Enums;

[GenerateSerializer]
public enum ApplicationStatus
{
    Pending,
    Approved,
    Rejected,
    Waitlisted
}
