using Microsoft.AspNetCore.Mvc;
using Orleans;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VolunteerController : ControllerBase
{
    private readonly IClusterClient _client;

    public VolunteerController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var grain = _client.GetGrain<IVolunteerGrain>(id);
        var profile = await grain.GetProfile();
        if (profile == null)
        {
            return NotFound();
        }
        return Ok(profile);
    }

    [HttpPost("{id}")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] VolunteerProfile profile)
    {
        var grain = _client.GetGrain<IVolunteerGrain>(id);
        await grain.UpdateProfile(profile);
        return Ok();
    }

    [HttpGet("{id}/organizations/{organizationId}/is-member")]
    public async Task<IActionResult> IsMemberOf(Guid id, Guid organizationId)
    {
        var grain = _client.GetGrain<IVolunteerGrain>(id);
        var isMember = await grain.IsMemberOf(organizationId);
        return Ok(new { isMember });
    }

    [HttpPost("{id}/organizations/{organizationId}/apply")]
    public async Task<IActionResult> ApplyToOrganization(Guid id, Guid organizationId)
    {
        var orgGrain = _client.GetGrain<IOrganizationGrain>(organizationId.ToString());
        await orgGrain.SubmitApplication(id);
        return Ok(new { Message = "Application submitted to organization for review." });
    }
}
