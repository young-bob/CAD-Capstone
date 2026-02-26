using VSMS.Grains.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Orleans;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoordinatorController : ControllerBase
{
    private readonly IClusterClient _client;

    public CoordinatorController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCoordinator(Guid id)
    {
        var grain = _client.GetGrain<ICoordinatorGrain>(id);
        var organizationId = await grain.GetOrganizationId();
        return Ok(new { organizationId });
    }

    [HttpPost("{id}/organization")]
    public async Task<IActionResult> SetOrganization(Guid id, [FromBody] SetOrganizationRequest request)
    {
        var grain = _client.GetGrain<ICoordinatorGrain>(id);
        await grain.SetOrganization(request.OrganizationId);
        return Ok();
    }

    [HttpPost("{id}/shift")]
    public async Task<IActionResult> CreateShift(Guid id, [FromBody] CreateShiftRequest request)
    {
        var grain = _client.GetGrain<ICoordinatorGrain>(id);
        await grain.CreateShift(request.OpportunityId);
        return Ok();
    }

    [HttpPost("{id}/validate-attendance")]
    public async Task<IActionResult> ValidateAttendance(Guid id, [FromBody] ValidateAttendanceRequest request)
    {
        var grain = _client.GetGrain<ICoordinatorGrain>(id);
        await grain.ValidateAttendance(request.VolunteerId, request.OpportunityId);
        return Ok();
    }
}

public record SetOrganizationRequest(
    string OrganizationId
);

public record CreateShiftRequest(
    Guid OpportunityId
);

public record ValidateAttendanceRequest(
    Guid VolunteerId,
    Guid OpportunityId
);
