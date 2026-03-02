using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class OrganizationEventHandlers(AppDbContext dbContext) :
    IEventHandler<OrganizationCreatedEvent>,
    IEventHandler<OrganizationStatusChangedEvent>
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
}
