using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Infrastructure.Data;

public class EfCoreOrganizationQueryService(AppDbContext dbContext) : IOrganizationQueryService
{
    public async Task<List<OrganizationSummary>> GetPendingOrganizationsAsync()
    {
        return await dbContext.OrganizationReadModels
            .Where(o => o.Status == VSMS.Abstractions.Enums.OrgStatus.PendingApproval)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<List<OrganizationSummary>> GetApprovedOrganizationsAsync()
    {
        return await dbContext.OrganizationReadModels
            .Where(o => o.Status == VSMS.Abstractions.Enums.OrgStatus.Approved)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<OrganizationSummary?> GetOrganizationAsync(Guid orgId)
    {
        return await dbContext.OrganizationReadModels
            .Where(o => o.OrgId == orgId)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .FirstOrDefaultAsync();
    }
}

public class EfCoreOpportunityQueryService(AppDbContext dbContext) : IOpportunityQueryService
{
    public async Task<List<OpportunitySummary>> SearchPublishedAsync(string? query = null, string? category = null)
    {
        var q = dbContext.OpportunityReadModels
            .Where(o => o.Status == VSMS.Abstractions.Enums.OpportunityStatus.Published);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var qLower = query.ToLower();
            q = q.Where(o => o.Title.ToLower().Contains(qLower) || o.OrganizationName.ToLower().Contains(qLower));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            q = q.Where(o => o.Category == category);
        }

        return await q.OrderByDescending(o => o.PublishDate)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();
    }

    public async Task<List<OpportunitySummary>> GetByOrganizationAsync(Guid organizationId)
    {
        return await dbContext.OpportunityReadModels
            .Where(o => o.OrganizationId == organizationId)
            .OrderByDescending(o => o.PublishDate)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();
    }

    public async Task<List<OpportunitySummary>> GetByIdsAsync(IEnumerable<Guid> opportunityIds)
    {
        return await dbContext.OpportunityReadModels
            .Where(o => opportunityIds.Contains(o.OpportunityId))
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();
    }
}

public class EfCoreApplicationQueryService(AppDbContext dbContext) : IApplicationQueryService
{
    public async Task<List<ApplicationSummary>> GetByOpportunityAsync(Guid opportunityId)
    {
        var apps = await dbContext.ApplicationReadModels
            .Where(a => a.OpportunityId == opportunityId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync();

        var volunteerIds = apps.Select(a => a.VolunteerId).ToList();
        var attendanceMap = await dbContext.AttendanceReadModels
            .Where(ar => ar.OpportunityId == opportunityId && volunteerIds.Contains(ar.VolunteerId))
            .GroupBy(ar => ar.VolunteerId)
            .ToDictionaryAsync(g => g.Key, g => g.First().Status);

        return apps.Select(a => new ApplicationSummary(
            a.ApplicationId, a.OpportunityId, a.ShiftId, a.OpportunityTitle, a.ShiftName,
            a.ShiftStartTime, a.ShiftEndTime, a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt,
            attendanceMap.TryGetValue(a.VolunteerId, out var s) ? s.ToString() : null))
            .ToList();
    }

    public async Task<List<ApplicationSummary>> GetByVolunteerAsync(Guid volunteerId)
    {
        return await dbContext.ApplicationReadModels
            .Where(a => a.VolunteerId == volunteerId)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new ApplicationSummary(
                a.ApplicationId, a.OpportunityId, a.ShiftId, a.OpportunityTitle, a.ShiftName,
                a.ShiftStartTime, a.ShiftEndTime, a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt))
            .ToListAsync();
    }

    public async Task<List<ApplicationSummary>> GetByOrganizationAsync(Guid organizationId)
    {
        var opportunityIds = await dbContext.OpportunityReadModels
            .Where(o => o.OrganizationId == organizationId)
            .Select(o => o.OpportunityId)
            .ToListAsync();

        var apps = await dbContext.ApplicationReadModels
            .Where(a => opportunityIds.Contains(a.OpportunityId))
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync();

        var volunteerIds = apps.Select(a => a.VolunteerId).ToList();
        var attendanceMap = await dbContext.AttendanceReadModels
            .Where(ar => opportunityIds.Contains(ar.OpportunityId) && volunteerIds.Contains(ar.VolunteerId))
            .GroupBy(ar => new { ar.OpportunityId, ar.VolunteerId })
            .ToDictionaryAsync(g => (g.Key.OpportunityId, g.Key.VolunteerId), g => g.First().Status);

        return apps.Select(a => new ApplicationSummary(
            a.ApplicationId, a.OpportunityId, a.ShiftId, a.OpportunityTitle, a.ShiftName,
            a.ShiftStartTime, a.ShiftEndTime, a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt,
            attendanceMap.TryGetValue((a.OpportunityId, a.VolunteerId), out var s) ? s.ToString() : null))
            .ToList();
    }
}

public class EfCoreAttendanceQueryService(AppDbContext dbContext) : IAttendanceQueryService
{
    public async Task<List<AttendanceSummary>> GetByOpportunityAsync(Guid opportunityId)
    {
        return await dbContext.AttendanceReadModels
            .Where(a => a.OpportunityId == opportunityId)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId, a.VolunteerName, a.OpportunityTitle,
                a.Status, a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();
    }

    public async Task<List<AttendanceSummary>> GetByVolunteerAsync(Guid volunteerId)
    {
        return await dbContext.AttendanceReadModels
            .Where(a => a.VolunteerId == volunteerId)
            .OrderByDescending(a => a.CheckInTime)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId, a.VolunteerName, a.OpportunityTitle,
                a.Status, a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();
    }

    public async Task<List<DisputeSummary>> GetPendingDisputesAsync()
    {
        return await dbContext.DisputeReadModels
            .OrderBy(d => d.RaisedAt)
            .Select(d => new DisputeSummary(
                d.AttendanceId, d.VolunteerId, d.VolunteerName, d.OpportunityTitle,
                d.Reason, d.EvidenceUrl, d.RaisedAt))
            .ToListAsync();
    }
}
