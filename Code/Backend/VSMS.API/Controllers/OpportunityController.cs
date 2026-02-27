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

    [HttpGet]
    public async Task<IActionResult> GetOpportunities()
    {
        var registry = _client.GetGrain<IOpportunityRegistryGrain>("global");
        var ids = await registry.GetAllOpportunityIds();

        var tasks = ids.Select(async id =>
        {
            var grain = _client.GetGrain<IOpportunityGrain>(id);
            return await grain.GetDetails();
        });

        var results = await Task.WhenAll(tasks);
        var opportunities = results.Where(d => d != null).ToList();
        return Ok(opportunities);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOpportunity([FromBody] CreateOpportunityRequest request)
    {
        var opportunityId = Guid.NewGuid();
        var grain = _client.GetGrain<IOpportunityGrain>(opportunityId);

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
            0,
            request.RequiredSkillIds
        );

        await grain.UpdateDetails(details);

        var orgGrain = _client.GetGrain<IOrganizationGrain>(request.OrganizationId);
        await orgGrain.PublishOpportunity(opportunityId);

        var registry = _client.GetGrain<IOpportunityRegistryGrain>("global");
        await registry.RegisterOpportunity(opportunityId);

        return CreatedAtAction(nameof(GetOpportunity), new { id = opportunityId }, details);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOpportunity(Guid id, [FromBody] UpdateOpportunityRequest request)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var existing = await grain.GetDetails();
        if (existing == null)
        {
            return NotFound();
        }

        var updated = existing with
        {
            Title = request.Title,
            Description = request.Description,
            Visibility = request.Visibility,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            VenueLocation = request.VenueLocation,
            GeoFenceRadius = request.GeoFenceRadius,
            MaxVolunteers = request.MaxVolunteers,
            RequiredSkillIds = request.RequiredSkillIds
        };

        await grain.UpdateDetails(updated);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOpportunity(Guid id)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var existing = await grain.GetDetails();
        if (existing == null)
        {
            return NotFound();
        }

        await grain.DeleteOpportunity();

        var registry = _client.GetGrain<IOpportunityRegistryGrain>("global");
        await registry.UnregisterOpportunity(id);

        return NoContent();
    }

    [HttpGet("{id}/applications")]
    public async Task<IActionResult> GetApplications(Guid id)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var existing = await grain.GetDetails();
        if (existing == null)
        {
            return NotFound();
        }

        var applications = await grain.GetApplications();
        return Ok(applications);
    }

    [HttpPost("{id}/applications/{appId}/process")]
    public async Task<IActionResult> ProcessApplication(Guid id, Guid appId, [FromBody] ProcessApplicationRequest request)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var existing = await grain.GetDetails();
        if (existing == null)
        {
            return NotFound();
        }

        await grain.ProcessApplication(appId, request.Status, request.RejectionReason);
        return NoContent();
    }

    [HttpGet("{id}/enrollments")]
    public async Task<IActionResult> GetEnrollments(Guid id)
    {
        var grain = _client.GetGrain<IOpportunityGrain>(id);
        var existing = await grain.GetDetails();
        if (existing == null)
        {
            return NotFound();
        }

        var enrollments = await grain.GetEnrollments();
        return Ok(enrollments);
    }
}

public record CreateOpportunityRequest(
    Guid OrganizationId,
    string Title,
    string Description,
    Grains.Interfaces.Enums.OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers,
    List<Guid>? RequiredSkillIds = null
);

public record UpdateOpportunityRequest(
    string Title,
    string Description,
    Grains.Interfaces.Enums.OpportunityVisibility Visibility,
    DateTime StartTime,
    DateTime EndTime,
    Location VenueLocation,
    float GeoFenceRadius,
    int MaxVolunteers,
    List<Guid>? RequiredSkillIds = null
);

public record ProcessApplicationRequest(
    Grains.Interfaces.Enums.ApplicationStatus Status,
    string? RejectionReason = null
);
