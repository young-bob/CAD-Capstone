using Orleans;

namespace VSMS.Grains.Interfaces.Enums;

[GenerateSerializer]
public enum CertificateTemplateType
{
    StudentHourLog,
    StandardCertificate,
    DistrictForm
}
