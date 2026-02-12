using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface ICertificateTemplateGrain : IGrainWithGuidKey
{
    Task UpdateTemplate(CertificateTemplate template);
    Task<CertificateTemplate?> GetTemplate();
    Task<string> GenerateCertificatePdf(Dictionary<string, string> data);
}
