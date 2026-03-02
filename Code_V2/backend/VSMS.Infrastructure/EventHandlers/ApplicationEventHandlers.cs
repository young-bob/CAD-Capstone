using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class ApplicationEventHandlers(AppDbContext dbContext) :
    IEventHandler<ApplicationSubmittedEvent>,
    IEventHandler<ApplicationStatusChangedEvent>
{
    public async Task HandleAsync(ApplicationSubmittedEvent domainEvent)
    {
        dbContext.ApplicationReadModels.Add(new ApplicationReadModel
        {
            ApplicationId = domainEvent.ApplicationId,
            OpportunityId = domainEvent.OpportunityId,
            ShiftId = domainEvent.ShiftId,
            OpportunityTitle = domainEvent.OpportunityTitle,
            ShiftName = domainEvent.ShiftName,
            ShiftStartTime = domainEvent.ShiftStartTime,
            ShiftEndTime = domainEvent.ShiftEndTime,
            VolunteerId = domainEvent.VolunteerId,
            VolunteerName = domainEvent.VolunteerName,
            Status = domainEvent.Status,
            AppliedAt = domainEvent.AppliedAt
        });
        await dbContext.SaveChangesAsync();
    }

    public async Task HandleAsync(ApplicationStatusChangedEvent domainEvent)
    {
        var app = await dbContext.ApplicationReadModels.FindAsync(domainEvent.ApplicationId);
        if (app != null)
        {
            app.Status = domainEvent.Status;
            await dbContext.SaveChangesAsync();
        }
    }
}
