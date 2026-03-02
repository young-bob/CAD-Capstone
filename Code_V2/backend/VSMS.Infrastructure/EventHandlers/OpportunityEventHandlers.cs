using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class OpportunityEventHandlers(AppDbContext dbContext) :
    IEventHandler<OpportunityCreatedEvent>,
    IEventHandler<OpportunityStatusChangedEvent>,
    IEventHandler<OpportunitySpotsUpdatedEvent>,
    IEventHandler<OpportunitySkillsUpdatedEvent>
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
}
