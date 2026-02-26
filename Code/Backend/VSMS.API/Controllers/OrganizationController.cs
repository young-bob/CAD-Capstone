using Microsoft.AspNetCore.Mvc;
using Orleans;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationController : ControllerBase
{
    private readonly IClusterClient _client;

    public OrganizationController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var grain = _client.GetGrain<IOrganizationGrain>(id);
        var profile = await grain.GetProfile();
        if (profile == null)
        {
            return NotFound();
        }
        return Ok(profile);
    }

    [HttpPost("{id}")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] OrganizationProfile profile)
    {
        var grain = _client.GetGrain<IOrganizationGrain>(id);
        await grain.UpdateProfile(profile);
        return Ok();
    }

    [HttpPost("{id}/verify-credential")]
    public async Task<IActionResult> VerifyCredential(Guid id, [FromBody] VerifyCredentialRequest request)
    {
        var grain = _client.GetGrain<IOrganizationGrain>(id);
        await grain.VerifyCredential(request.VolunteerId, request.CredentialId);
        return Ok();
    }

    [HttpPost("{id}/publish-opportunity")]
    public async Task<IActionResult> PublishOpportunity(Guid id, [FromBody] PublishOpportunityRequest request)
    {
        var grain = _client.GetGrain<IOrganizationGrain>(id);
        await grain.PublishOpportunity(request.OpportunityId);
        return Ok();
    }

    [HttpGet("{id}/opportunities")]
    public async Task<IActionResult> GetPublishedOpportunities(Guid id)
    {
        var grain = _client.GetGrain<IOrganizationGrain>(id);
        var opportunities = await grain.GetPublishedOpportunities();
        return Ok(opportunities);
    }
}

public record VerifyCredentialRequest(
    Guid VolunteerId,
    Guid CredentialId
);

public record PublishOpportunityRequest(
    Guid OpportunityId
);
