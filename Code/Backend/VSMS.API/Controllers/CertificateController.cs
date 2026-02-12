using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Microsoft.AspNetCore.Mvc;
using Orleans;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CertificateController : ControllerBase
{
    private readonly IClusterClient _client;

    public CertificateController(IClusterClient client)
    {
        _client = client;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateCertificate([FromBody] CertificateRequest request)
    {
        var certId = Guid.NewGuid();
        var grain = _client.GetGrain<ICertificateGrain>(certId);
        await grain.Generate(request.VolunteerId, request.AttendanceRecordIds, request.TemplateId);

        var certificate = await grain.GetCertificate();
        return CreatedAtAction(nameof(GetCertificate), new { id = certId }, certificate);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCertificate(Guid id)
    {
        var grain = _client.GetGrain<ICertificateGrain>(id);
        var certificate = await grain.GetCertificate();
        if (certificate == null)
        {
            return NotFound();
        }
        return Ok(certificate);
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadCertificate(Guid id)
    {
        var grain = _client.GetGrain<ICertificateGrain>(id);
        var fileUrl = await grain.GetFileUrl();
        if (string.IsNullOrEmpty(fileUrl))
        {
            return NotFound();
        }
        return Ok(new { downloadUrl = fileUrl });
    }

    [HttpPost("{id}/sign")]
    public async Task<IActionResult> SignCertificate(Guid id, [FromBody] SignatureRequest request)
    {
        var grain = _client.GetGrain<ICertificateGrain>(id);
        await grain.Sign(request.CoordinatorSignature);
        return Ok();
    }
}

public record CertificateRequest(
    Guid VolunteerId,
    List<Guid> AttendanceRecordIds,
    Guid TemplateId
);

public record SignatureRequest(
    string CoordinatorSignature
);
