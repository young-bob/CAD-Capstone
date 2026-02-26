using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Microsoft.AspNetCore.Mvc;
using Orleans;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OpportunityController : ControllerBase
{
    private readonly IClusterClient _client;

    public OpportunityController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOpportunity(Guid id)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var details = await grain.GetDetails();
        if (details == null)
        {
            return NotFound();
        }
        return Ok(details);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOpportunity([FromBody] CreateOpportunityRequest request)
    {
        var opportunityId = Guid.NewGuid();
        var grain = _client.GetGrain<IOpportunityGrain>(opportunityId);

        var orgGrain = _client.GetGrain<IOrganizationGrain>(request.OrganizationId.ToString());
        var orgProfile = await orgGrain.GetProfile();

        if (orgProfile == null || orgProfile.OrganizationId == Guid.Empty)
            return NotFound("Organization not found.");

        if (!orgProfile.IsActive)
            return BadRequest("This organization is currently inactive. You cannot create new opportunities.");

        var details = new OpportunityDetails(
            opportunityId,
            request.OrganizationId,
            request.Title,
            request.Description,
            request.Visibility,
            request.StartTime,
            request.EndTime,
            request.VenueLocation,
            request.GeoFenceRadius,
            request.MaxVolunteers,
            0  // RegisteredCount starts at 0
        );

        await grain.UpdateDetails(details);

        // Also notify the organization grain
        await orgGrain.PublishOpportunity(opportunityId);

        return CreatedAtAction(nameof(GetOpportunity), new { id = opportunityId }, details);
    }

    [HttpGet]
    public async Task<IActionResult> GetOpportunities()
    {
        // TODO: Implement a registry grain to list all opportunities.
        // For now, return an empty list or mock data.
        return Ok(new List<OpportunityDetails>());
    }
}

// DTO for creating opportunities
public record CreateOpportunityRequest(
    Guid OrganizationId,
    string Title,
    string Description,
    Grains.Interfaces.Enums.OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers
);
