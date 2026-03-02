using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Volunteers;

public static class VolunteerEndpoints
{
    public static void MapVolunteerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/volunteers").WithTags("Volunteers").RequireAuthorization();

        group.MapGet("/{id:guid}/profile", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            return Results.Ok(await grain.GetProfile());
        });

        group.MapPut("/{id:guid}/profile", async (Guid id, UpdateProfileRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UpdateProfile(req.FirstName, req.LastName, req.Email, req.Phone, req.Bio);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/applications", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            return Results.Ok(await grain.GetApplications());
        });

        group.MapPost("/{id:guid}/credentials", async (Guid id, UploadCredentialRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UploadCredential(req.CredentialUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/feedback", async (Guid id, FeedbackRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.SubmitFeedback(req.OpportunityId, req.Rating, req.Comment);
            return Results.NoContent();
        });

        group.MapPut("/{id:guid}/privacy", async (Guid id, PrivacySettingsRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.UpdatePrivacySettings(req.IsProfilePublic, req.AllowEmail, req.AllowPush);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/push-token", async (Guid id, RegisterPushTokenRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            await grain.RegisterPushToken(req.Token);
            return Results.NoContent();
        });

        group.MapGet("/{id:guid}/push-token", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IVolunteerGrain>(id);
            var token = await grain.GetPushToken();
            return Results.Ok(new { token });
        });

        group.MapGet("/{id:guid}/attendance", async (Guid id, IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetByVolunteerAsync(id)));
    }

}
