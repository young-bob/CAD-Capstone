using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Opportunities;

public static class OpportunityEndpoints
{
    public static void MapOpportunityEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/opportunities").WithTags("Opportunities").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            return Results.Ok(await grain.GetState());
        });

        group.MapGet("/", async (string? query, string? category, int? skip, int? take, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.SearchPublishedAsync(query, category, skip ?? 0, take ?? 500));
        });

        group.MapGet("/by-ids", async ([FromQuery] Guid[] ids, IOpportunityQueryService queryService) =>
        {
            return Results.Ok(await queryService.GetByIdsAsync(ids));
        });

        group.MapGet("/recommend", async (
            Guid volunteerId,
            double? lat,
            double? lon,
            string? query,
            string? category,
            int? skip,
            int? take,
            HttpContext http,
            AppDbContext db,
            IGrainFactory grains) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByUserId(volunteerId))
                return Results.Forbid();

            var safeSkip = Math.Max(0, skip ?? 0);
            var safeTake = take.GetValueOrDefault(100);
            if (safeTake <= 0) safeTake = 100;
            if (safeTake > 500) safeTake = 500;

            var volunteer = await db.Volunteers
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.UserId == volunteerId);
            if (volunteer is null)
                return Results.NotFound(new { Error = "Volunteer not found." });

            var volunteerSkillIds = await grains.GetGrain<IVolunteerGrain>(volunteer.GrainId).GetSkillIds();
            var volunteerSkillSet = volunteerSkillIds.ToHashSet();

            var opportunitiesQuery = db.OpportunityReadModels
                .AsNoTracking()
                .Where(o => o.Status == OpportunityStatus.Published && o.AvailableSpots > 0);

            if (!string.IsNullOrWhiteSpace(query))
            {
                var qLower = query.Trim().ToLower();
                opportunitiesQuery = opportunitiesQuery.Where(o =>
                    o.Title.ToLower().Contains(qLower) || o.OrganizationName.ToLower().Contains(qLower));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                opportunitiesQuery = opportunitiesQuery.Where(o => o.Category == category);
            }

            var opportunities = await opportunitiesQuery.ToListAsync();
            var now = DateTime.UtcNow;

            var ranked = opportunities
                .Select(o =>
                {
                    var requiredSkillIds = o.RequiredSkillIds ?? [];
                    var requiredSkillCount = requiredSkillIds.Count;
                    var matchedSkillCount = requiredSkillCount == 0
                        ? 0
                        : requiredSkillIds.Count(id => volunteerSkillSet.Contains(id));

                    var skillMatchRatio = requiredSkillCount == 0
                        ? 0.6
                        : (double)matchedSkillCount / requiredSkillCount;

                    var distanceKm = lat.HasValue && lon.HasValue && o.Latitude.HasValue && o.Longitude.HasValue
                        ? HaversineKm(lat.Value, lon.Value, o.Latitude.Value, o.Longitude.Value)
                        : (double?)null;

                    var distanceScore = distanceKm.HasValue ? DistanceScore(distanceKm.Value) : 0.5;
                    var ageDays = Math.Max(0, (now - o.PublishDate).TotalDays);
                    var freshnessScore = Math.Max(0.1, 1.0 - (ageDays / 30.0));

                    var recommendationScore = (skillMatchRatio * 0.65) + (distanceScore * 0.30) + (freshnessScore * 0.05);

                    return new OpportunityRecommendation(
                        o.OpportunityId,
                        o.OrganizationId,
                        o.OrganizationName,
                        o.Title,
                        o.Category,
                        o.Status,
                        o.PublishDate,
                        o.TotalSpots,
                        o.AvailableSpots,
                        o.Latitude,
                        o.Longitude,
                        matchedSkillCount,
                        requiredSkillCount,
                        Math.Round(skillMatchRatio, 4),
                        distanceKm.HasValue ? Math.Round(distanceKm.Value, 2) : null,
                        Math.Round(recommendationScore, 4),
                        o.RequiredSkillIds
                    );
                })
                .OrderByDescending(x => x.RecommendationScore)
                .ThenByDescending(x => x.MatchedSkillCount)
                .ThenBy(x => x.DistanceKm ?? double.MaxValue)
                .ThenByDescending(x => x.PublishDate)
                .Skip(safeSkip)
                .Take(safeTake)
                .ToList();

            return Results.Ok(new
            {
                VolunteerSkillCount = volunteerSkillIds.Count,
                Opportunities = ranked,
            });
        });

        group.MapPost("/{id:guid}/publish", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Publish();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/cancel", async (Guid id, CancelRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Cancel(req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/shifts", async (Guid id, AddShiftRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.AddShift(req.Name, req.StartTime, req.EndTime, req.MaxCapacity);
            return Results.NoContent();
        });

        group.MapPut("/{id:guid}/shifts/{shiftId:guid}", async (Guid id, Guid shiftId, UpdateShiftRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.UpdateShift(shiftId, req.Name, req.StartTime, req.EndTime, req.MaxCapacity);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}/shifts/{shiftId:guid}", async (Guid id, Guid shiftId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.RemoveShift(shiftId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/recover", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.Recover();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/apply", async (Guid id, ApplyRequest req, HttpContext http, IGrainFactory grains) =>
        {
            if (!http.IsSelfByGrainId(req.VolunteerId))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var appId = await grain.SubmitApplication(req.VolunteerId, req.ShiftId, req.IdempotencyKey);
            return Results.Created($"/api/applications/{appId}", new { ApplicationId = appId });
        });

        group.MapDelete("/{id:guid}/apply/{appId:guid}", async (Guid id, Guid appId, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var appGrain = grains.GetGrain<IApplicationGrain>(appId);
            var state = await appGrain.GetState();
            if (state.OpportunityId != id)
                return Results.BadRequest(new { Error = "Application does not belong to opportunity." });
            if (!http.IsSelfByGrainId(state.VolunteerId) && !await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.WithdrawApplication(appId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/geofence", async (Guid id, SetGeoFenceRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.SetGeoFence(req.Lat, req.Lon, req.RadiusMeters);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/validate-geo", async (Guid id, ValidateGeoRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            var isValid = await grain.ValidateGeoLocation(req.Lat, req.Lon);
            return Results.Ok(new { isValid });
        });

        group.MapPut("/{id:guid}/skills", async (Guid id, SetRequiredSkillsRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.SetRequiredSkills(req.SkillIds);
            return Results.NoContent();
        });
        group.MapPut("/{id:guid}/info", async (Guid id, UpdateInfoRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IOpportunityGrain>(id);
            await grain.UpdateInfo(req.Title, req.Description, req.Category, req.Lat, req.Lon, req.RadiusMeters);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/notify", async (Guid id, NotifyVolunteersRequest req, HttpContext http, AppDbContext db, IGrainFactory grains, IApplicationQueryService queryService) =>
        {
            if (!await http.CanManageOpportunityAsync(db, id, grains))
                return Results.Forbid();

            var applications = await queryService.GetByOpportunityAsync(id);
            var targetIds = req.TargetIds is { Count: > 0 }
                ? req.TargetIds
                : req.TargetStatus == "Approved"
                    ? applications.Where(a => a.Status == ApplicationStatus.Approved || a.Status == ApplicationStatus.Promoted).Select(a => a.VolunteerId).Distinct().ToList()
                    : applications.Select(a => a.VolunteerId).Distinct().ToList();

            if (targetIds.Count > 0)
            {
                // Get sender name from opportunity read model
                var opp = await db.OpportunityReadModels.AsNoTracking().FirstOrDefaultAsync(o => o.OpportunityId == id);
                var senderName = opp?.OrganizationName ?? "Coordinator";

                // Persist notification records so volunteers can see them in their web inbox
                var now = DateTime.UtcNow;
                var notifications = targetIds.Select(volunteerId => new NotificationEntity
                {
                    Id = Guid.NewGuid(),
                    VolunteerGrainId = volunteerId,
                    Title = "Message from " + senderName,
                    Message = req.Message,
                    SenderName = senderName,
                    SentAt = now,
                    IsRead = false,
                }).ToList();
                db.Notifications.AddRange(notifications);
                await db.SaveChangesAsync();

                // Also send Expo push notification (for mobile)
                var notificationGrain = grains.GetGrain<INotificationGrain>(Guid.Empty);
                await notificationGrain.SendBulkNotification(targetIds, "Coordinator Message", req.Message);
            }

            return Results.Ok(new { sent = targetIds.Count });
        });
    }

    private static double DistanceScore(double distanceKm)
    {
        if (distanceKm <= 2) return 1.0;
        if (distanceKm <= 5) return 0.85;
        if (distanceKm <= 10) return 0.7;
        if (distanceKm <= 20) return 0.5;
        if (distanceKm <= 40) return 0.25;
        return 0.1;
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private static double ToRadians(double degrees) => degrees * (Math.PI / 180.0);
}
