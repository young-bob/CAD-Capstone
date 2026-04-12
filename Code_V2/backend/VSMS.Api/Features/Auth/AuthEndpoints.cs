using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Auth;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");

        auth.MapPost("/register", async (RegisterRequest req, AppDbContext db, JwtSettings jwt, IGrainFactory grains, IEmailService email) =>
        {
            // Only Volunteer and Coordinator can self-register
            var allowedRoles = new[] { "Volunteer", "Coordinator" };
            if (!allowedRoles.Contains(req.Role))
                return Results.BadRequest(new { Error = $"Role '{req.Role}' cannot be self-registered." });

            if (await db.Users.AnyAsync(u => u.Email == req.Email))
                return Results.Conflict(new { Error = "Email already registered." });

            var user = new UserEntity
            {
                Email = req.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = req.Role,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(); // user.Id is now populated

            var grainId = Guid.NewGuid();

            // Create child profile entity and initialize the grain actor
            if (req.Role == "Volunteer")
            {
                db.Volunteers.Add(new VolunteerEntity { UserId = user.Id, GrainId = grainId });
                await db.SaveChangesAsync();

                var grain = grains.GetGrain<IVolunteerGrain>(grainId);
                await grain.UpdateProfile(string.Empty, string.Empty, req.Email, string.Empty, string.Empty);
            }
            else // Coordinator
            {
                db.Coordinators.Add(new CoordinatorEntity { UserId = user.Id, GrainId = grainId });
                await db.SaveChangesAsync();

                var grain = grains.GetGrain<ICoordinatorGrain>(grainId);
                await grain.Initialize(string.Empty, string.Empty, req.Email, string.Empty, Guid.Empty);
            }

            var token = GenerateToken(user, jwt, grainId);

            // Send welcome email — fire-and-forget so a mail failure never blocks registration
            _ = email.SendAsync(
                to: user.Email,
                subject: "Welcome to VSMS!",
                body: $"""
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                        <h2 style="color:#f59e0b">Welcome to VSMS 🎉</h2>
                        <p>Hi there,</p>
                        <p>Your <strong>{user.Role}</strong> account has been created successfully.</p>
                        <p>You can now log in and start exploring volunteer opportunities.</p>
                        <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0"/>
                        <p style="color:#57534e;font-size:13px">If you didn't sign up for VSMS, you can safely ignore this email.</p>
                    </div>
                    """);

            return Results.Created($"/api/auth/{user.Id}",
                new AuthResponse(token, user.Email, user.Role, user.Id, grainId));
        }).AllowAnonymous();

        auth.MapPost("/login", async (LoginRequest req, AppDbContext db, JwtSettings jwt) =>
        {
            var user = await db.Users
                .Include(u => u.VolunteerProfile)
                .Include(u => u.CoordinatorProfile)
                .Include(u => u.AdminProfile)
                .FirstOrDefaultAsync(u => u.Email == req.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Results.Unauthorized();

            if (user.IsBanned)
                return Results.Forbid();

            // Resolve grainId from the child entity
            var grainId = user.Role switch
            {
                "Volunteer" => user.VolunteerProfile?.GrainId,
                "Coordinator" => user.CoordinatorProfile?.GrainId,
                "SystemAdmin" => user.AdminProfile?.GrainId,
                _ => null
            } ?? Guid.Empty;

            var token = GenerateToken(user, jwt, grainId);
            return Results.Ok(new AuthResponse(token, user.Email, user.Role, user.Id, grainId));
        }).AllowAnonymous();
    }

    private static string GenerateToken(UserEntity user, JwtSettings settings, Guid grainId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("GrainId", grainId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(settings.ExpirationMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

