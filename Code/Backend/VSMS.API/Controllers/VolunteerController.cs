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

    [HttpPost("{id}/apply/{opportunityId}")]
    public async Task<IActionResult> Apply(Guid id, Guid opportunityId)
    {
        try
        {
            var grain = _client.GetGrain<IVolunteerGrain>(id);
            var application = await grain.ApplyForOpportunity(opportunityId);
            return Ok(application);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/applications")]
    public async Task<IActionResult> GetApplications(Guid id)
    {
        var volunteerGrain = _client.GetGrain<IVolunteerGrain>(id);
        var localApps = await volunteerGrain.GetApplications();

        // Re-fetch fresh status from each OpportunityGrain
        var grouped = localApps.GroupBy(a => a.OpportunityId);
        var result = new List<object>();

        foreach (var group in grouped)
        {
            var oppGrain = _client.GetGrain<IOpportunityGrain>(group.Key);
            var freshApps = await oppGrain.GetApplications();
            var oppDetails = await oppGrain.GetDetails();

            foreach (var localApp in group)
            {
                var fresh = freshApps.FirstOrDefault(a => a.AppId == localApp.AppId) ?? localApp;
                result.Add(new
                {
                    fresh.AppId,
                    fresh.VolunteerId,
                    fresh.OpportunityId,
                    fresh.SubmissionDate,
                    fresh.Status,
                    fresh.RejectionReason,
                    OpportunityTitle = oppDetails?.Title ?? "Unknown"
                });
            }
        }

        return Ok(result);
    }
}
