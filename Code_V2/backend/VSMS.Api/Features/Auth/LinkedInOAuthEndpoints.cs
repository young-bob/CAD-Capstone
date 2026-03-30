using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.LinkedIn;

namespace VSMS.Api.Features.Auth;

public static class LinkedInOAuthEndpoints
{
    public static void MapLinkedInOAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth/linkedin").WithTags("Auth");

        // GET /api/auth/linkedin/url
        // Returns the LinkedIn OAuth authorization URL for the frontend to redirect to
        group.MapGet("/url", (HttpContext http, LinkedInService linkedin) =>
        {
            var userId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
            var state = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(userId));
            var url = linkedin.GetAuthorizationUrl(state);
            return Results.Ok(new { url });
        }).RequireAuthorization();

        // GET /api/auth/linkedin/callback
        // LinkedIn redirects here after user authorizes — verifies identity and marks volunteer as LinkedIn-verified
        group.MapGet("/callback", async (string code, string state, HttpContext http, LinkedInService linkedin, IGrainFactory grains, AppDbContext db) =>
        {
            // Decode userId from state
            string userId;
            try { userId = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(state)); }
            catch { return Results.BadRequest(new { Error = "Invalid state parameter." }); }

            var profile = await linkedin.ExchangeCodeForProfileAsync(code);
            if (profile is null)
                return Results.BadRequest(new { Error = "Failed to retrieve LinkedIn profile." });

            // Build LinkedIn profile URL from the sub (OpenID Connect subject = LinkedIn member ID)
            var linkedInUrl = $"https://www.linkedin.com/in/{profile.Sub}";

            // Find the volunteer grain and mark as verified
            var volunteer = await db.Volunteers
                .FirstOrDefaultAsync(v => v.UserId == Guid.Parse(userId));

            if (volunteer is null)
                return Results.NotFound(new { Error = "Volunteer not found." });

            var grain = grains.GetGrain<IVolunteerGrain>(volunteer.GrainId);
            await grain.SetLinkedInVerified(linkedInUrl);

            // Redirect to web frontend profile page after successful verification
            var frontendUrl = app.Configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
            return Results.Redirect($"{frontendUrl}/volunteer?tab=profile&linkedin=verified");
        }).AllowAnonymous();
    }
}
