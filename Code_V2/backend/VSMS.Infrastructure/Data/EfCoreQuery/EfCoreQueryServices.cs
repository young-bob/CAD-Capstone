using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Data.EfCoreQuery;

public class EfCoreOrganizationQueryService(AppDbContext db) : IOrganizationQueryService
{
    public async Task<List<OrganizationSummary>> GetPendingOrganizationsAsync(int skip = 0, int take = 500) =>
        await db.OrganizationReadModels
            .Where(o => o.Status == OrgStatus.PendingApproval)
            .OrderBy(o => o.CreatedAt)
            .Skip(skip).Take(take)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();

    public async Task<List<OrganizationSummary>> GetApprovedOrganizationsAsync(int skip = 0, int take = 500) =>
        await db.OrganizationReadModels
            .Where(o => o.Status == OrgStatus.Approved)
            .OrderBy(o => o.Name)
            .Skip(skip).Take(take)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();

    public async Task<List<OrganizationSummary>> GetAllOrganizationsAsync(OrgStatus? status = null, int skip = 0, int take = 500)
    {
        var q = db.OrganizationReadModels.AsQueryable();
        if (status.HasValue)
            q = q.Where(o => o.Status == status.Value);
        return await q.OrderBy(o => o.CreatedAt).Skip(skip).Take(take)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<OrganizationSummary?> GetOrganizationAsync(Guid orgId)
    {
        var o = await db.OrganizationReadModels.FindAsync(orgId);
        return o is null ? null : new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt);
    }
}

public class EfCoreOpportunityQueryService(AppDbContext db) : IOpportunityQueryService
{
    public async Task<List<OpportunitySummary>> SearchPublishedAsync(string? query = null, string? category = null)
    {
        var q = db.OpportunityReadModels.Where(o => o.Status == OpportunityStatus.Published);
        if (!string.IsNullOrWhiteSpace(query))
            q = q.Where(o => o.Title.Contains(query) || o.OrganizationName.Contains(query));
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(o => o.Category == category);

        return await q.OrderBy(o => o.PublishDate)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName,
                o.Title, o.Category, o.Status, o.PublishDate,
                o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();
    }

    public async Task<List<OpportunitySummary>> GetByOrganizationAsync(Guid organizationId) =>
        await db.OpportunityReadModels
            .Where(o => o.OrganizationId == organizationId)
            .OrderByDescending(o => o.PublishDate)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName,
                o.Title, o.Category, o.Status, o.PublishDate,
                o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();

    public async Task<List<OpportunitySummary>> GetByIdsAsync(IEnumerable<Guid> opportunityIds)
    {
        var ids = opportunityIds.ToList();
        return await db.OpportunityReadModels
            .Where(o => ids.Contains(o.OpportunityId))
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName,
                o.Title, o.Category, o.Status, o.PublishDate,
                o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude))
            .ToListAsync();
    }
}

public class EfCoreApplicationQueryService(AppDbContext db) : IApplicationQueryService
{
    public async Task<List<ApplicationSummary>> GetByOpportunityAsync(Guid opportunityId) =>
        await db.ApplicationReadModels
            .Where(a => a.OpportunityId == opportunityId)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new ApplicationSummary(
                a.ApplicationId, a.OpportunityId, a.ShiftId,
                a.OpportunityTitle, a.ShiftName, a.ShiftStartTime, a.ShiftEndTime,
                a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt))
            .ToListAsync();

    public async Task<List<ApplicationSummary>> GetByVolunteerAsync(Guid volunteerId) =>
        await db.ApplicationReadModels
            .Where(a => a.VolunteerId == volunteerId)
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new ApplicationSummary(
                a.ApplicationId, a.OpportunityId, a.ShiftId,
                a.OpportunityTitle, a.ShiftName, a.ShiftStartTime, a.ShiftEndTime,
                a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt))
            .ToListAsync();

    public async Task<List<ApplicationSummary>> GetByOrganizationAsync(Guid organizationId)
    {
        var oppIds = await db.OpportunityReadModels
            .Where(o => o.OrganizationId == organizationId)
            .Select(o => o.OpportunityId)
            .ToListAsync();

        return await db.ApplicationReadModels
            .Where(a => oppIds.Contains(a.OpportunityId))
            .OrderByDescending(a => a.AppliedAt)
            .Select(a => new ApplicationSummary(
                a.ApplicationId, a.OpportunityId, a.ShiftId,
                a.OpportunityTitle, a.ShiftName, a.ShiftStartTime, a.ShiftEndTime,
                a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt))
            .ToListAsync();
    }
}

public class EfCoreAttendanceQueryService(AppDbContext db) : IAttendanceQueryService
{
    public async Task<List<AttendanceSummary>> GetByOpportunityAsync(Guid opportunityId) =>
        await db.AttendanceReadModels
            .Where(a => a.OpportunityId == opportunityId)
            .OrderByDescending(a => a.CheckInTime)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId,
                a.VolunteerName, a.OpportunityTitle, a.Status,
                a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();

    public async Task<List<AttendanceSummary>> GetByVolunteerAsync(Guid volunteerId) =>
        await db.AttendanceReadModels
            .Where(a => a.VolunteerId == volunteerId)
            .OrderByDescending(a => a.CheckInTime)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId,
                a.VolunteerName, a.OpportunityTitle, a.Status,
                a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();

    public async Task<List<DisputeSummary>> GetPendingDisputesAsync() =>
        await db.DisputeReadModels
            .OrderBy(d => d.RaisedAt)
            .Select(d => new DisputeSummary(
                d.AttendanceId, d.VolunteerId, d.VolunteerName,
                d.OpportunityTitle, d.Reason, d.EvidenceUrl, d.RaisedAt))
            .ToListAsync();
}
