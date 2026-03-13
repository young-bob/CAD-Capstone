using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Orleans;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IClusterClient _client;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IClusterClient client,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _client = client;
        _configuration = configuration;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { Message = "Email and password are required" });
            }

            // Check if email already exists
            var emailIndexGrain = _client.GetGrain<IEmailIndexGrain>(request.Email.ToLower());
            var existingUserId = await emailIndexGrain.GetUserIdByEmail();

            if (existingUserId.HasValue)
            {
                return Conflict(new { Message = "Email already registered" });
            }

            // All public registrations default strictly to "User" role.
            // They can later be promoted to "Volunteer" by a Coordinator 
            // or to "Coordinator" by an Admin.
            string assignedRole = "User";

            // Create new user
            var userId = Guid.NewGuid();
            var userGrain = _client.GetGrain<IUserGrain>(userId);

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User(
                userId,
                request.Email.ToLower(),
                hashedPassword,
                assignedRole,
                DateTime.UtcNow,
                null,
                true
            );

            await userGrain.CreateUser(user);

            // Register email index
            await emailIndexGrain.RegisterEmail(userId);

            _logger.LogInformation("New base user registered: {UserId}, Role: {Role}", userId, assignedRole);

            return Created($"/api/auth/{userId}", new
            {
                UserId = userId,
                Email = user.Email,
                Role = user.Role,
                Message = "Registration successful"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            return StatusCode(500, new { Message = "An error occurred during registration" });
        }
    }

    [AllowAnonymous]
    [HttpPost("setup-admin")]
    public async Task<IActionResult> SetupAdmin([FromBody] RegisterRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { Message = "Email and password are required" });
            }

            // Check if email already exists
            var emailIndexGrain = _client.GetGrain<IEmailIndexGrain>(request.Email.ToLower());
            var existingUserId = await emailIndexGrain.GetUserIdByEmail();

            if (existingUserId.HasValue)
            {
                return Conflict(new { Message = "Email already registered" });
            }

            // Create new admin user
            var userId = Guid.NewGuid();
            var userGrain = _client.GetGrain<IUserGrain>(userId);

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User(
                userId,
                request.Email.ToLower(),
                hashedPassword,
                "admin",
                DateTime.UtcNow,
                null,
                true
            );

            await userGrain.CreateUser(user);

            // Register email index
            await emailIndexGrain.RegisterEmail(userId);

            _logger.LogInformation("New admin user registered: {UserId}", userId);

            return Created($"/api/auth/{userId}", new
            {
                UserId = userId,
                Email = user.Email,
                Role = user.Role,
                Message = "Admin setup successful"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during admin setup");
            return StatusCode(500, new { Message = "An error occurred during admin setup" });
        }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { Message = "Email and password are required" });
            }

            // Find user by email
            var emailIndexGrain = _client.GetGrain<IEmailIndexGrain>(request.Email.ToLower());
            var userId = await emailIndexGrain.GetUserIdByEmail();

            if (!userId.HasValue)
            {
                return Unauthorized(new { Message = "Invalid email or password" });
            }

            // Validate password
            var userGrain = _client.GetGrain<IUserGrain>(userId.Value);
            var isValidPassword = await userGrain.ValidatePassword(request.Password);

            if (!isValidPassword)
            {
                _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
                return Unauthorized(new { Message = "Invalid email or password" });
            }

            // Update last login time
            await userGrain.UpdateLastLogin();

            // Get user profile
            var user = await userGrain.GetProfile();
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { Message = "Account is inactive" });
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);

            _logger.LogInformation("User logged in: {UserId}", userId.Value);

            return Ok(new
            {
                Token = token,
                UserId = user.UserId,
                Email = user.Email,
                Role = user.Role
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { Message = "An error occurred during login" });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _logger.LogInformation("User logged out: {UserId}", userId);

        // Note: With JWT, actual logout is handled client-side by discarding the token
        return Ok(new { Message = "Logged out successfully" });
    }

    [HttpPost("reset-password")]
    [Authorize]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var userGrain = _client.GetGrain<IUserGrain>(userId);
            var success = await userGrain.ResetPassword(request.OldPassword, request.NewPassword);

            if (!success)
            {
                return BadRequest(new { Message = "Invalid old password" });
            }

            _logger.LogInformation("Password reset successful for user: {UserId}", userId);
            return Ok(new { Message = "Password reset successful" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return StatusCode(500, new { Message = "An error occurred during password reset" });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var userGrain = _client.GetGrain<IUserGrain>(userId);
            var user = await userGrain.GetProfile();

            if (user == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                UserId = user.UserId,
                Email = user.Email,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                IsActive = user.IsActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, new { Message = "An error occurred" });
        }
    }

    private string GenerateJwtToken(User user)
    {
        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// DTOs
public record LoginRequest(string Email, string Password);

public record RegisterRequest(
    string Name,
    string Email,
    string Password,
    string? PhoneNumber,
    string? Bio,
    Location? Location
);

public record ResetPasswordRequest(string OldPassword, string NewPassword);
