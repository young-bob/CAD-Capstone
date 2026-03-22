using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Orleans;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class OpportunityEventHandlers(
    AppDbContext dbContext,
    IGrainFactory grains,
    IEmailService email,
    ILogger<OpportunityEventHandlers> logger) :
    IEventHandler<OpportunityCreatedEvent>,
    IEventHandler<OpportunityStatusChangedEvent>,
    IEventHandler<OpportunitySpotsUpdatedEvent>,
    IEventHandler<OpportunitySkillsUpdatedEvent>,
    IEventHandler<OpportunityGeoFenceUpdatedEvent>
{
    public async Task HandleAsync(OpportunityCreatedEvent domainEvent)
    {
        var orgName = await dbContext.OrganizationReadModels
            .Where(o => o.OrgId == domainEvent.OrganizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync() ?? "Unknown Organization";

        dbContext.OpportunityReadModels.Add(new OpportunityReadModel
        {
            OpportunityId = domainEvent.OpportunityId,
            OrganizationId = domainEvent.OrganizationId,
            OrganizationName = orgName,
            Title = domainEvent.Title,
            Category = domainEvent.Category,
            Status = domainEvent.Status,
            PublishDate = domainEvent.PublishDate,
            TotalSpots = domainEvent.TotalSpots,
            AvailableSpots = domainEvent.TotalSpots,
            Latitude = domainEvent.Latitude,
            Longitude = domainEvent.Longitude
        });
        await dbContext.SaveChangesAsync();
    }

    public async Task HandleAsync(OpportunityStatusChangedEvent domainEvent)
    {
        var opp = await dbContext.OpportunityReadModels.FindAsync(domainEvent.OpportunityId);
        if (opp != null)
        {
            opp.Status = domainEvent.Status;
            await dbContext.SaveChangesAsync();

            // Notify followers when an opportunity is published
            if (domainEvent.Status == OpportunityStatus.Published)
            {
                var followerIds = await dbContext.VolunteerFollows
                    .AsNoTracking()
                    .Where(f => f.OrgId == opp.OrganizationId)
                    .Select(f => f.VolunteerGrainId)
                    .ToListAsync();

                if (followerIds.Count > 0)
                {
                    var notifGrain = grains.GetGrain<INotificationGrain>(Guid.Empty);
                    var tasks = followerIds.Select(async grainId =>
                    {
                        try
                        {
                            var profile = await grains.GetGrain<IVolunteerGrain>(grainId).GetProfile();
                            var msg = $"{opp.OrganizationName} just posted \"{opp.Title}\"";
                            if (profile.AllowPushNotifications)
                                await notifGrain.SendNotification(grainId, "NewOpportunity", msg);
                            if (profile.AllowEmailNotifications && !string.IsNullOrWhiteSpace(profile.Email))
                            {
                                var html = $"<div style='font-family:sans-serif'><p>Hi {profile.FirstName},</p><p><strong>{opp.OrganizationName}</strong> just posted a new volunteer opportunity: <strong>{opp.Title}</strong>.</p><p>Log in to VSMS to view and apply.</p></div>";
                                await email.SendAsync(profile.Email, $"New opportunity: {opp.Title}", html);
                            }
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Failed to notify follower {VolunteerId} of opportunity {OppId}", grainId, domainEvent.OpportunityId);
                        }
                    });
                    await Task.WhenAll(tasks);
                }
            }
        }
    }

    public async Task HandleAsync(OpportunitySpotsUpdatedEvent domainEvent)
    {
        var opp = await dbContext.OpportunityReadModels.FindAsync(domainEvent.OpportunityId);
        if (opp != null)
        {
            opp.TotalSpots = domainEvent.TotalSpots;
            opp.AvailableSpots = domainEvent.AvailableSpots;
            await dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Mirrors OpportunityState.RequiredSkillIds into the read model.
    /// This makes skill-based matching a pure DB query — no Grains need to be activated.
    /// </summary>
    public async Task HandleAsync(OpportunitySkillsUpdatedEvent domainEvent)
    {
        var opp = await dbContext.OpportunityReadModels.FindAsync(domainEvent.OpportunityId);
        if (opp != null)
        {
            opp.RequiredSkillIds = domainEvent.RequiredSkillIds;
            await dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Mirrors the geofence lat/lon into the read model so opportunity search
    /// and distance-based ranking can use the DB directly without activating grains.
    /// </summary>
    public async Task HandleAsync(OpportunityGeoFenceUpdatedEvent domainEvent)
    {
        var opp = await dbContext.OpportunityReadModels.FindAsync(domainEvent.OpportunityId);
        if (opp != null)
        {
            opp.Latitude = domainEvent.Latitude;
            opp.Longitude = domainEvent.Longitude;
            await dbContext.SaveChangesAsync();
        }
    }
}
