using Orleans;
using Orleans.Runtime;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.Grains;

public class CertificateGrain : Grain, ICertificateGrain
{
    private readonly IPersistentState<CertificateState> _state;

    public CertificateGrain([PersistentState("certificate", "grain-store")] IPersistentState<CertificateState> state)
    {
        _state = state;
    }

    public async Task Generate(Guid volunteerId, List<Guid> attendanceRecordIds, Guid templateId)
    {
        var certId = this.GetPrimaryKey();
        var fileUrl = $"/certificates/{certId}.pdf"; // Placeholder for actual PDF generation

        _state.State.Details = new Certificate(
            certId,
            string.Empty, // Signature added later
            DateTime.UtcNow,
            fileUrl,
            volunteerId,
            attendanceRecordIds
        );

        await _state.WriteStateAsync();
    }

    public Task<Certificate?> GetCertificate()
    {
        return Task.FromResult(_state.State.Details);
    }

    public Task<string> GetFileUrl()
    {
        return Task.FromResult(_state.State.Details?.FileUrl ?? string.Empty);
    }

    public async Task Sign(string coordinatorSignature)
    {
        if (_state.State.Details != null)
        {
            _state.State.Details = _state.State.Details with
            {
                CoordinatorSignature = coordinatorSignature
            };
            await _state.WriteStateAsync();
        }
        else
        {
            throw new InvalidOperationException("Cannot sign a certificate that hasn't been generated.");
        }
    }
}

[GenerateSerializer]
public class CertificateState
{
    [Id(0)]
    public Certificate? Details { get; set; }
}
