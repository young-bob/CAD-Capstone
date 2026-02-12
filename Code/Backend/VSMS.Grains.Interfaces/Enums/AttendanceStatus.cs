using Orleans;

namespace VSMS.Grains.Interfaces.Enums;

[GenerateSerializer]
public enum AttendanceStatus
{
    Pending,
    Confirmed,
    Rejected
}
