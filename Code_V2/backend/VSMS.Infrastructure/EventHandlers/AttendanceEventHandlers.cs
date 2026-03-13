using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.EventHandlers;

public class AttendanceEventHandlers(AppDbContext dbContext) :
    IEventHandler<AttendanceRecordedEvent>,
    IEventHandler<AttendanceStatusChangedEvent>,
    IEventHandler<DisputeRaisedEvent>,
    IEventHandler<DisputeResolvedEvent>
{
    public async Task HandleAsync(AttendanceRecordedEvent domainEvent)
    {
        var existing = await dbContext.AttendanceReadModels.FindAsync(domainEvent.AttendanceId);
        if (existing != null)
        {
            // Update existing record (e.g., Pending → CheckedIn)
            existing.Status = domainEvent.Status;
            existing.CheckInTime = domainEvent.CheckInTime;
            existing.CheckOutTime = domainEvent.CheckOutTime;
            existing.TotalHours = domainEvent.TotalHours;
        }
        else
        {
            dbContext.AttendanceReadModels.Add(new AttendanceReadModel
            {
                AttendanceId = domainEvent.AttendanceId,
                OpportunityId = domainEvent.OpportunityId,
                VolunteerId = domainEvent.VolunteerId,
                VolunteerName = domainEvent.VolunteerName,
                OpportunityTitle = domainEvent.OpportunityTitle,
                Status = domainEvent.Status,
                ShiftStartTime = domainEvent.ShiftStartTime,
                CheckInTime = domainEvent.CheckInTime,
                CheckOutTime = domainEvent.CheckOutTime,
                TotalHours = domainEvent.TotalHours
            });
        }
        await dbContext.SaveChangesAsync();
    }

    public async Task HandleAsync(AttendanceStatusChangedEvent domainEvent)
    {
        var att = await dbContext.AttendanceReadModels.FindAsync(domainEvent.AttendanceId);
        if (att != null)
        {
            att.Status = domainEvent.Status;
            att.CheckOutTime = domainEvent.CheckOutTime;
            att.TotalHours = domainEvent.TotalHours;
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task HandleAsync(DisputeRaisedEvent domainEvent)
    {
        dbContext.DisputeReadModels.Add(new DisputeReadModel
        {
            AttendanceId = domainEvent.AttendanceId,
            VolunteerId = domainEvent.VolunteerId,
            VolunteerName = domainEvent.VolunteerName,
            OpportunityTitle = domainEvent.OpportunityTitle,
            Reason = domainEvent.Reason,
            EvidenceUrl = domainEvent.EvidenceUrl,
            RaisedAt = domainEvent.RaisedAt
        });
        await dbContext.SaveChangesAsync();
    }

    public async Task HandleAsync(DisputeResolvedEvent domainEvent)
    {
        var disp = await dbContext.DisputeReadModels.FindAsync(domainEvent.AttendanceId);
        if (disp != null)
        {
            dbContext.DisputeReadModels.Remove(disp); // Dispute resolved, remove from pending queue
            await dbContext.SaveChangesAsync();
        }
    }
}
