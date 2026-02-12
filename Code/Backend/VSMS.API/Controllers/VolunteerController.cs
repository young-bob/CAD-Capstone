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
}
