using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface ICertificateGrain : IGrainWithGuidKey
{
    Task Generate(Guid volunteerId, List<Guid> attendanceRecordIds, Guid templateId);
    Task<Certificate?> GetCertificate();
    Task<string> GetFileUrl();
    Task Sign(string coordinatorSignature);
}
