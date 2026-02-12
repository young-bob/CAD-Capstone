using Orleans;

namespace VSMS.Grains.Interfaces.Enums;

[GenerateSerializer]
public enum CredentialType
{
    BackgroundCheck,
    CprCertification,
    VaccineRecord,
    Other
}
