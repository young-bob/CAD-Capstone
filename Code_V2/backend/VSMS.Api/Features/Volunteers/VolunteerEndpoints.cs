using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Volunteers;

public static class VolunteerEndpoints
{
    public static void MapVolunteerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/volunteers").WithTags("Volunteers").RequireAuthorization();

        group.MapGet("/{id:guid}/profile", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSystemAdmin() && !http.IsCoordinator() && !http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            return Results.Ok(await grain.GetProfile());
        });

        group.MapPut("/{id:guid}/profile", async (Guid id, UpdateProfileRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UpdateProfile(req.FirstName, req.LastName, req.Email, req.Phone, req.Bio, req.LinkedInUrl);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/applications", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            return Results.Ok(await grain.GetApplications());
        });

        group.MapPost("/{id:guid}/credentials", async (Guid id, UploadCredentialRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UploadCredential(req.CredentialUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/feedback", async (Guid id, FeedbackRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.SubmitFeedback(req.OpportunityId, req.Rating, req.Comment);
            return Results.NoContent();
        });

        group.MapPut("/{id:guid}/privacy", async (Guid id, PrivacySettingsRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UpdatePrivacySettings(req.IsProfilePublic, req.AllowEmail, req.AllowPush);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/push-token", async (Guid id, RegisterPushTokenRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.RegisterPushToken(req.Token);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/push-token", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            var token = await grain.GetPushToken();
            return Results.Ok(new { token });
        });

        group.MapGet("/{id:guid}/attendance", async (Guid id, int? skip, int? take, HttpContext http, IAttendanceQueryService queryService) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByGrainId(id))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByVolunteerAsync(id, null, skip ?? 0, take ?? 500));
        });

        group.MapPost("/{id:guid}/background-check", async (Guid id, SetBackgroundCheckRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSystemAdmin() && !http.IsCoordinator())
                return Results.Forbid();
            var allowed = new[] { "NotSubmitted", "Pending", "Cleared", "Expired" };
            if (!allowed.Contains(req.Status))
                return Results.BadRequest(new { Error = "Invalid status. Use: NotSubmitted, Pending, Cleared, or Expired." });
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.SetBackgroundCheckStatus(req.Status);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/waiver", async (Guid id, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.SignWaiver();
            var profile = await grain.GetProfile();
            return Results.Ok(new { signedAt = profile.WaiverSignedAt });
        });

        group.MapPost("/{id:guid}/follow/{orgId:guid}", async (Guid id, Guid orgId, HttpContext http, IGrainFactory grains, AppDbContext db) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();

            var orgExists = await db.OrganizationReadModels.AnyAsync(o => o.OrgId == orgId);
            if (!orgExists)
                return Results.NotFound(new { Error = "Organization not found." });

            var already = await db.VolunteerFollows.AnyAsync(f => f.VolunteerGrainId == id && f.OrgId == orgId);
            if (!already)
            {
                db.VolunteerFollows.Add(new VolunteerFollowEntity { VolunteerGrainId = id, OrgId = orgId });
                await db.SaveChangesAsync();
            }

            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.FollowOrg(orgId);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}/follow/{orgId:guid}", async (Guid id, Guid orgId, HttpContext http, IGrainFactory grains, AppDbContext db) =>
        {
            if (!http.IsSelfByGrainId(id))
                return Results.Forbid();

            var row = await db.VolunteerFollows.FirstOrDefaultAsync(f => f.VolunteerGrainId == id && f.OrgId == orgId);
            if (row != null)
            {
                db.VolunteerFollows.Remove(row);
                await db.SaveChangesAsync();
            }

            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UnfollowOrg(orgId);
            return Results.NoContent();
        });
    }

}
