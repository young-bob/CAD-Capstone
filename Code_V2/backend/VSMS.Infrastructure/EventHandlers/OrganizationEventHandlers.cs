using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class OrganizationEventHandlers(AppDbContext dbContext) :
    IEventHandler<OrganizationCreatedEvent>,
    IEventHandler<OrganizationStatusChangedEvent>,
    IEventHandler<OrganizationProfileUpdatedEvent>,
    IEventHandler<OrganizationAnnouncementPostedEvent>
{
    public async Task HandleAsync(OrganizationCreatedEvent domainEvent)
    {
        dbContext.OrganizationReadModels.Add(new OrganizationReadModel
        {
            OrgId = domainEvent.OrgId,
            Name = domainEvent.Name,
            Description = domainEvent.Description,
            Status = domainEvent.Status,
            CreatedAt = domainEvent.CreatedAt
        });
        await dbContext.SaveChangesAsync();
    }

    public async Task HandleAsync(OrganizationStatusChangedEvent domainEvent)
    {
        var org = await dbContext.OrganizationReadModels.FindAsync(domainEvent.OrgId);
        if (org != null)
        {
            org.Status = domainEvent.Status;
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task HandleAsync(OrganizationProfileUpdatedEvent domainEvent)
    {
        var org = await dbContext.OrganizationReadModels.FindAsync(domainEvent.OrgId);
        if (org != null)
        {
            org.WebsiteUrl = domainEvent.WebsiteUrl;
            org.ContactEmail = domainEvent.ContactEmail;
            org.Tags = domainEvent.Tags;
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task HandleAsync(OrganizationAnnouncementPostedEvent domainEvent)
    {
        var org = await dbContext.OrganizationReadModels.FindAsync(domainEvent.OrgId);
        if (org != null)
        {
            org.LatestAnnouncementText = domainEvent.Text;
            org.LatestAnnouncementAt = domainEvent.CreatedAt;
            await dbContext.SaveChangesAsync();
        }
    }
}
