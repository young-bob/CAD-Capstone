using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class CertificateTemplateGrain : Grain, ICertificateTemplateGrain
{
    private readonly IPersistentState<CertificateTemplateState> _state;

    public CertificateTemplateGrain([PersistentState("certificateTemplate", "grain-store")] IPersistentState<CertificateTemplateState> state)
    {
        _state = state;
    }

    public async Task UpdateTemplate(CertificateTemplate template)
    {
        _state.State.Template = template;
        await _state.WriteStateAsync();
    }

    public Task<CertificateTemplate?> GetTemplate()
    {
        return Task.FromResult(_state.State.Template);
    }

    public Task<string> GenerateCertificatePdf(Dictionary<string, string> data)
    {
        // Placeholder for actual PDF generation logic
        // In a real implementation, this would use a PDF library like QuestPDF or iTextSharp
        // to generate a PDF based on the template layout and provided data

        var templateId = this.GetPrimaryKey();
        var fileName = $"{templateId}_{Guid.NewGuid()}.pdf";
        var filePath = $"/certificates/{fileName}";

        // TODO: Implement actual PDF generation using the template's LayoutConfig

        return Task.FromResult(filePath);
    }
}

[GenerateSerializer]
public class CertificateTemplateState
{
    [Id(0)]
    public CertificateTemplate? Template { get; set; }
}
