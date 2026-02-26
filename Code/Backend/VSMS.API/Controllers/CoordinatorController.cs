using VSMS.Grains.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Orleans;

using System.Security.Claims;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoordinatorController : ControllerBase
{
    private readonly IClusterClient _client;
    private readonly ILogger<CoordinatorController> _logger;

    public CoordinatorController(IClusterClient client, ILogger<CoordinatorController> logger)
    {
        _client = client;
        _logger = logger;
    }

    [HttpGet("organizations/{id}/applications")]
    public async Task<IActionResult> GetPendingApplications(Guid id)
    {
        // Enforce Coordinator
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Coordinator" && role != "admin")
        {
            return Forbid();
        }

        var orgGrain = _client.GetGrain<IOrganizationGrain>(id.ToString());
        var pendingIds = await orgGrain.GetPendingApplications();

        var applicants = new List<object>();

        foreach (var applicantId in pendingIds)
        {
            var userGrain = _client.GetGrain<IUserGrain>(applicantId);
            var userProfile = await userGrain.GetProfile();

            if (userProfile != null)
            {
                applicants.Add(new
                {
                    UserId = userProfile.UserId,
                    Email = userProfile.Email,
                    Name = userProfile.Email, // Map Name from another DB or claim when available
                    AppliedAt = DateTime.UtcNow
                });
            }
        }

        return Ok(applicants);
    }

    [HttpPost("organizations/{id}/applications/{userId}/approve")]
    public async Task<IActionResult> ApproveApplication(Guid id, Guid userId)
    {
        // Enforce Coordinator
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Coordinator" && role != "admin")
        {
            return Forbid();
        }

        // 1. Remove from organization's pending list
        var orgGrain = _client.GetGrain<IOrganizationGrain>(id.ToString());
        await orgGrain.ApproveApplication(userId);

        // 2. Fetch Base User
        var userGrain = _client.GetGrain<IUserGrain>(userId);
        var baseUserProfile = await userGrain.GetProfile();

        if (baseUserProfile == null) return NotFound(new { Message = "User not found." });

        // 3. Promote to Volunteer globally if they are currently just a User
        if (baseUserProfile.Role == "User")
        {
            await userGrain.UpdateRole("Volunteer");
        }

        // 4. Initialize VolunteerGrain and add this Org to JoinedOrganizations
        var volunteerGrain = _client.GetGrain<IVolunteerGrain>(userId);

        var existingVolunteerProfile = await volunteerGrain.GetProfile();

        if (existingVolunteerProfile == null || existingVolunteerProfile.UserId == Guid.Empty)
        {
            // Create fresh
            await volunteerGrain.UpdateProfile(new VolunteerProfile(
               userId,
               baseUserProfile.Email, // Fallback to Email as Name
               baseUserProfile.Email,
               "",
               "",
               0.0,
               new Location(0, 0, "", "", "", ""),
               new List<Guid> { id } // Join this org immediately
           ));
        }
        else
        {
            await volunteerGrain.ApplyToOrganization(id);
        }

        return Ok(new { Message = "User approved and promoted to Volunteer successfully." });
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
