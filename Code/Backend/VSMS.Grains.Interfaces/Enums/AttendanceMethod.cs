using Orleans;

namespace VSMS.Grains.Interfaces.Enums;

[GenerateSerializer]
public enum AttendanceMethod
{
    GPS,
    QRCode
}
