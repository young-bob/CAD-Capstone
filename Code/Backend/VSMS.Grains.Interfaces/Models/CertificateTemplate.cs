using VSMS.Grains.Interfaces.Enums;
using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record CertificateTemplate(
    Guid TemplateId,
    string Name,
    string DistrictRegion,
    CertificateTemplateType Type,
    string LayoutConfig
);
