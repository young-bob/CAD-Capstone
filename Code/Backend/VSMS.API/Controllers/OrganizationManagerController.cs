using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Orleans;
using VSMS.Grains.Interfaces;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationManagerController : ControllerBase
{
    private readonly IClusterClient _client;

    public OrganizationManagerController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "OrganizationManager")
        {
            return Forbid();
        }

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var managerGrain = _client.GetGrain<IOrganizationManagerGrain>(userId);
        var profile = await managerGrain.GetProfile();

        if (profile == null)
            return NotFound("Organization Manager profile not found.");

        return Ok(profile);
    }

    // NOTE: For real-world use we extract the organization ID from the token 
    // to prevent cross-organization tampering, but for now we accept it via route
    // to match the Coordinator controller pattern, and secure it internally.

    [HttpGet("organizations/{id}/coordinators")]
    public async Task<IActionResult> GetOrganizationCoordinators(Guid id)
    {
        if (!await IsAuthorizedForOrg(id)) return Forbid();

        var registry = _client.GetGrain<IRegistryGrain>(0);
        var coords = await registry.GetCoordinators();
        var orgCoords = coords.Where(c => c.OrganizationId == id).ToList();

        return Ok(orgCoords);
    }

    [HttpPost("organizations/{id}/coordinators")]
    public async Task<IActionResult> AssignCoordinator(Guid id, [FromBody] AssignCoordinatorRequest request)
    {
        if (!await IsAuthorizedForOrg(id)) return Forbid();

        var registry = _client.GetGrain<IRegistryGrain>(0);

        // Ensure Org exists
        var orgs = await registry.GetOrganizations();
        if (!orgs.Any(o => o.OrganizationId == id))
            return NotFound("Organization not found.");

        // Check user
        var userGrain = _client.GetGrain<IUserGrain>(request.UserId);
        var profile = await userGrain.GetProfile();

        if (profile == null)
            return NotFound("User not found.");

        if (profile.Role != "Coordinator")
        {
            await userGrain.UpdateRole("Coordinator");
        }

        var coordinatorGrain = _client.GetGrain<ICoordinatorGrain>(request.UserId);
        await coordinatorGrain.UpdateProfile(new VSMS.Grains.Interfaces.Models.CoordinatorProfile(
            request.UserId,
            profile.Email,
            profile.Email,
            id,
            request.JobTitle ?? "Coordinator"
        ));

        await registry.RemoveVolunteer(request.UserId);
        return Ok(new { Message = "Coordinator assigned successfully" });
    }

    [HttpDelete("organizations/{id}/coordinators/{userId}")]
    public async Task<IActionResult> RemoveCoordinator(Guid id, Guid userId)
    {
        if (!await IsAuthorizedForOrg(id)) return Forbid();

        var registry = _client.GetGrain<IRegistryGrain>(0);

        var coords = await registry.GetCoordinators();
        var existingCoord = coords.FirstOrDefault(c => c.UserId == userId && c.OrganizationId == id);

        if (existingCoord == null)
            return NotFound("Coordinator not found for this organization.");

        await registry.RemoveCoordinator(userId);

        var userGrain = _client.GetGrain<IUserGrain>(userId);
        var profile = await userGrain.GetProfile();
        if (profile != null && profile.Role == "Coordinator")
        {
            await userGrain.UpdateRole("User");
        }

        return Ok(new { Message = "Coordinator removed successfully." });
    }

    private async Task<bool> IsAuthorizedForOrg(Guid requestedOrgId)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "OrganizationManager") return false;

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId)) return false;

        var managerGrain = _client.GetGrain<IOrganizationManagerGrain>(userId);
        var orgId = await managerGrain.GetOrganizationId();

        return orgId == requestedOrgId;
    }
}
