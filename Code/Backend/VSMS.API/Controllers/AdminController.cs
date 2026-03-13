using Microsoft.AspNetCore.Mvc;
using Orleans;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IClusterClient _client;

    public AdminController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet("organizations")]
    public async Task<IActionResult> GetOrganizations()
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var orgs = await registry.GetOrganizations();
        return Ok(orgs);
    }

    [HttpPost("organizations")]
    public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationRequest request)
    {
        // For admin to create an org directly.
        var newOrgId = Guid.NewGuid();
        var orgGrain = _client.GetGrain<IOrganizationGrain>(newOrgId);

        var profile = new OrganizationProfile(
            newOrgId,
            request.Name,
            request.ContactEmail,
            request.Description ?? "",
            "", // Default logo
            request.Website ?? "",
            new Location(0, 0, "", "", "", ""),
            "Admin created", // VerificationProof
            true, // IsVerified
            "" // CalendarSyncUrl
        );

        await orgGrain.UpdateProfile(profile);
        return Created($"/api/Admin/organizations/{newOrgId}", profile);
    }

    [HttpPut("organizations/{id}")]
    public async Task<IActionResult> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationRequest request)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var orgs = await registry.GetOrganizations();
        var existingOrg = orgs.FirstOrDefault(o => o.OrganizationId == id);

        if (existingOrg == null)
            return NotFound();

        var updatedProfile = existingOrg with
        {
            Name = request.Name ?? existingOrg.Name,
            ContactEmail = request.ContactEmail ?? existingOrg.ContactEmail, // Added this field in the update
            Description = request.Description ?? existingOrg.Description,
            Website = request.Website ?? existingOrg.Website,
            IsActive = request.IsActive ?? existingOrg.IsActive
        };

        var orgGrain = _client.GetGrain<IOrganizationGrain>(id);
        await orgGrain.UpdateProfile(updatedProfile);

        return Ok(updatedProfile);
    }

    [HttpDelete("organizations/{id}")]
    public async Task<IActionResult> DeleteOrganization(Guid id)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        await registry.RemoveOrganization(id);

        // Note: Could also theoretically call OrganizationGrain to deactivate it
        return Ok();
    }

    [HttpGet("volunteers")]
    public async Task<IActionResult> GetVolunteers()
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var vols = await registry.GetVolunteers();
        return Ok(vols);
    }

    [HttpDelete("volunteers/{id}")]
    public async Task<IActionResult> DeleteVolunteer(Guid id)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        await registry.RemoveVolunteer(id);
        return Ok();
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var users = await registry.GetUsers();

        // Return a safe DTO without the password hash
        var safeUsers = users.Select(u => new
        {
            u.UserId,
            u.Email,
            u.Role,
            u.CreatedAt,
            u.LastLoginAt,
            u.IsActive
        });

        return Ok(safeUsers);
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(Guid id, [FromBody] ResetUserPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.NewPassword))
            return BadRequest("Password cannot be empty.");

        var userGrain = _client.GetGrain<IUserGrain>(id);
        var profile = await userGrain.GetProfile();

        if (profile == null)
            return NotFound("User not found.");

        await userGrain.ForceResetPassword(request.NewPassword);
        return Ok(new { Message = "Password reset successfully." });
    }

    [HttpPost("users/{id}/change-role")]
    public async Task<IActionResult> ChangeUserRole(Guid id, [FromBody] ChangeRoleRequest request)
    {
        if (string.IsNullOrEmpty(request.NewRole) || !new[] { "Volunteer", "Coordinator" }.Contains(request.NewRole))
            return BadRequest("Invalid role.");

        var userGrain = _client.GetGrain<IUserGrain>(id);
        var profile = await userGrain.GetProfile();

        if (profile == null)
            return NotFound("User not found.");

        // Update global user role
        await userGrain.UpdateRole(request.NewRole);

        // Update coordinator/volunteer specific grain if needed
        if (request.NewRole == "Coordinator")
        {
            var coordGrain = _client.GetGrain<ICoordinatorGrain>(id);
            // No organization to assign at role-change time; org must be assigned separately.
            await coordGrain.SetOrganization(string.Empty);
        }
        else if (request.NewRole == "Volunteer")
        {
            // Volunteer grain starts with an empty skill list by default.
            _ = _client.GetGrain<IVolunteerGrain>(id);
        }

        return Ok(new { Message = "Role changed successfully." });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var userGrain = _client.GetGrain<IUserGrain>(id);
        var profile = await userGrain.GetProfile();

        if (profile == null)
            return NotFound("User not found.");

        var emailIndexGrain = _client.GetGrain<IEmailIndexGrain>(profile.Email.ToLower());
        await emailIndexGrain.RemoveEmail();

        var registry = _client.GetGrain<IRegistryGrain>(0);
        await registry.RemoveUser(id);
        await registry.RemoveVolunteer(id);
        await registry.RemoveCoordinator(id);

        await userGrain.DeleteUser();

        return Ok(new { Message = "User deleted successfully." });
    }

    [HttpGet("organizations/{id}")]
    public async Task<IActionResult> GetOrganization(Guid id)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var orgs = await registry.GetOrganizations();
        var org = orgs.FirstOrDefault(o => o.OrganizationId == id);

        if (org == null) return NotFound();
        return Ok(org);
    }

    [HttpGet("organizations/{id}/coordinators")]
    public async Task<IActionResult> GetOrganizationCoordinators(Guid id)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var coords = await registry.GetCoordinators();
        var orgCoords = coords.Where(c => c.OrganizationId == id).ToList();

        return Ok(orgCoords);
    }

    [HttpPost("organizations/{id}/coordinators")]
    public async Task<IActionResult> AssignCoordinator(Guid id, [FromBody] AssignCoordinatorRequest request)
    {
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

        // Change global user role if they are not already a coordinator
        if (profile.Role != "Coordinator")
        {
            await userGrain.UpdateRole("Coordinator");
        }

        var coordinatorGrain = _client.GetGrain<ICoordinatorGrain>(request.UserId);
        await coordinatorGrain.UpdateProfile(new CoordinatorProfile(
            request.UserId,
            profile.Email, // Map Name from somewhere later if needed
            profile.Email,
            id,
            request.JobTitle ?? "Coordinator"
        ));

        // Optionally remove from volunteer registry if they are no longer a volunteer
        await registry.RemoveVolunteer(request.UserId);

        return Ok(new { Message = "Coordinator assigned successfully" });
    }

    [HttpDelete("organizations/{id}/coordinators/{userId}")]
    public async Task<IActionResult> RemoveCoordinator(Guid id, Guid userId)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);

        // Ensure Org exists
        var orgs = await registry.GetOrganizations();
        if (!orgs.Any(o => o.OrganizationId == id))
            return NotFound("Organization not found.");

        var coords = await registry.GetCoordinators();
        var existingCoord = coords.FirstOrDefault(c => c.UserId == userId && c.OrganizationId == id);

        if (existingCoord == null)
            return NotFound("Coordinator not found for this organization.");

        // Remove from registry
        await registry.RemoveCoordinator(userId);

        // Reset user role back to 'User'
        var userGrain = _client.GetGrain<IUserGrain>(userId);
        var profile = await userGrain.GetProfile();
        if (profile != null && profile.Role == "Coordinator")
        {
            await userGrain.UpdateRole("User");
        }

        return Ok(new { Message = "Coordinator removed successfully." });
    }

    [HttpPost("organizations/{id}/create-account")]
    public async Task<IActionResult> CreateOrganizationAccount(Guid id, [FromBody] CreateOrganizationAccountRequest request)
    {
        var registry = _client.GetGrain<IRegistryGrain>(0);
        var orgs = await registry.GetOrganizations();
        if (!orgs.Any(o => o.OrganizationId == id))
            return NotFound("Organization not found.");

        var emailIndexGrain = _client.GetGrain<IEmailIndexGrain>(request.Email.ToLower());
        var existingUserId = await emailIndexGrain.GetUserIdByEmail();
        if (existingUserId.HasValue)
        {
            return Conflict(new { Message = "Email already registered for another account." });
        }

        // Create the underlying User Account with a special role
        var newUserId = Guid.NewGuid();
        var userGrain = _client.GetGrain<IUserGrain>(newUserId);
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var userProfile = new User(
            newUserId,
            request.Email.ToLower(),
            hashedPassword,
            "OrganizationManager",
            DateTime.UtcNow,
            null,
            true
        );

        await userGrain.CreateUser(userProfile);

        // Register email index so the user can login
        await emailIndexGrain.RegisterEmail(newUserId);

        // Bind the User to the Organization via OrganizationManagerGrain
        var managerGrain = _client.GetGrain<IOrganizationManagerGrain>(newUserId);
        await managerGrain.UpdateProfile(new OrganizationManagerProfile(
            newUserId,
            request.Email,
            id
        ));

        return Ok(new { Message = "Organization account created successfully.", UserId = newUserId });
    }
}

public record CreateOrganizationRequest(
    string Name,
    string ContactEmail,
    string? Description,
    string? Website
);

public record UpdateOrganizationRequest(
    string? Name,
    string? ContactEmail,
    string? Description,
    string? Website,
    bool? IsActive
);

public record AssignCoordinatorRequest(
    Guid UserId,
    string? JobTitle
);

public record ResetUserPasswordRequest(
    string NewPassword
);

public record ChangeRoleRequest(
    string NewRole
);

public record CreateOrganizationAccountRequest(
    string Name,
    string Email,
    string Password
);
