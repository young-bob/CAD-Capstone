using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Infrastructure.Data;

internal static class QueryPaging
{
    private const int DefaultTake = 500;
    private const int MaxTake = 500;

    public static (int Skip, int Take) Normalize(int skip, int take)
    {
        if (skip < 0) skip = 0;
        if (take <= 0) take = DefaultTake;
        if (take > MaxTake) take = MaxTake;
        return (skip, take);
    }
}

public class EfCoreOrganizationQueryService(AppDbContext dbContext) : IOrganizationQueryService
{
    public async Task<List<OrganizationSummary>> GetPendingOrganizationsAsync(int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.OrganizationReadModels
            .AsNoTracking()
            .Where(o => o.Status == VSMS.Abstractions.Enums.OrgStatus.PendingApproval)
            .OrderByDescending(o => o.CreatedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<List<OrganizationSummary>> GetApprovedOrganizationsAsync(int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.OrganizationReadModels
            .AsNoTracking()
            .Where(o => o.Status == VSMS.Abstractions.Enums.OrgStatus.Approved)
            .OrderByDescending(o => o.CreatedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<List<OrganizationSummary>> GetAllOrganizationsAsync(OrgStatus? status = null, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        var query = dbContext.OrganizationReadModels.AsNoTracking().AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .ToListAsync();
    }

    public async Task<OrganizationSummary?> GetOrganizationAsync(Guid orgId)
    {
        return await dbContext.OrganizationReadModels
            .AsNoTracking()
            .Where(o => o.OrgId == orgId)
            .Select(o => new OrganizationSummary(o.OrgId, o.Name, o.Description, o.Status, o.CreatedAt))
            .FirstOrDefaultAsync();
    }
}

public class EfCoreOpportunityQueryService(AppDbContext dbContext) : IOpportunityQueryService
{
    public async Task<List<OpportunitySummary>> SearchPublishedAsync(string? query = null, string? category = null, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        var q = dbContext.OpportunityReadModels
            .AsNoTracking()
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
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude, o.RequiredSkillIds))
            .ToListAsync();
    }

    public async Task<List<OpportunitySummary>> GetByOrganizationAsync(Guid organizationId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.OpportunityReadModels
            .AsNoTracking()
            .Where(o => o.OrganizationId == organizationId)
            .OrderByDescending(o => o.PublishDate)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude, o.RequiredSkillIds))
            .ToListAsync();
    }

    public async Task<List<OpportunitySummary>> GetByIdsAsync(IEnumerable<Guid> opportunityIds)
    {
        return await dbContext.OpportunityReadModels
            .AsNoTracking()
            .Where(o => opportunityIds.Contains(o.OpportunityId))
            .Select(o => new OpportunitySummary(
                o.OpportunityId, o.OrganizationId, o.OrganizationName, o.Title, o.Category,
                o.Status, o.PublishDate, o.TotalSpots, o.AvailableSpots, o.Latitude, o.Longitude, o.RequiredSkillIds))
            .ToListAsync();
    }
}

public class EfCoreApplicationQueryService(AppDbContext dbContext) : IApplicationQueryService
{
    public async Task<List<ApplicationSummary>> GetByOpportunityAsync(Guid opportunityId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        var apps = await dbContext.ApplicationReadModels
            .AsNoTracking()
            .Where(a => a.OpportunityId == opportunityId)
            .OrderByDescending(a => a.AppliedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .ToListAsync();

        var volunteerIds = apps.Select(a => a.VolunteerId).ToList();
        var attendanceMap = await dbContext.AttendanceReadModels
            .AsNoTracking()
            .Where(ar => ar.OpportunityId == opportunityId && volunteerIds.Contains(ar.VolunteerId))
            .GroupBy(ar => ar.VolunteerId)
            .ToDictionaryAsync(g => g.Key, g => g.First().Status);

        return apps.Select(a => new ApplicationSummary(
            a.ApplicationId, a.OpportunityId, a.ShiftId, a.OpportunityTitle, a.ShiftName,
            a.ShiftStartTime, a.ShiftEndTime, a.VolunteerId, a.VolunteerName, a.Status, a.AppliedAt,
            attendanceMap.TryGetValue(a.VolunteerId, out var s) ? s.ToString() : null))
            .ToList();
    }

    public async Task<List<ApplicationSummary>> GetByVolunteerAsync(Guid volunteerId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.ApplicationReadModels
            .AsNoTracking()
            .Where(a => a.VolunteerId == volunteerId)
            .Join(dbContext.OpportunityReadModels,
                a => a.OpportunityId,
                o => o.OpportunityId,
                (a, o) => new { a, OrganizationName = o.OrganizationName })
            .OrderByDescending(x => x.a.AppliedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(x => new ApplicationSummary(
                x.a.ApplicationId, x.a.OpportunityId, x.a.ShiftId, x.a.OpportunityTitle, x.a.ShiftName,
                x.a.ShiftStartTime, x.a.ShiftEndTime, x.a.VolunteerId, x.a.VolunteerName, x.a.Status, x.a.AppliedAt,
                null, x.OrganizationName))
            .ToListAsync();
    }

    public async Task<List<ApplicationSummary>> GetByOrganizationAsync(Guid organizationId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        var opportunityIds = await dbContext.OpportunityReadModels
            .AsNoTracking()
            .Where(o => o.OrganizationId == organizationId)
            .Select(o => o.OpportunityId)
            .ToListAsync();

        var apps = await dbContext.ApplicationReadModels
            .AsNoTracking()
            .Where(a => opportunityIds.Contains(a.OpportunityId))
            .OrderByDescending(a => a.AppliedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .ToListAsync();

        var volunteerIds = apps.Select(a => a.VolunteerId).ToList();
        var attendanceMap = await dbContext.AttendanceReadModels
            .AsNoTracking()
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
    public async Task<List<AttendanceSummary>> GetByOpportunityAsync(Guid opportunityId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.AttendanceReadModels
            .AsNoTracking()
            .Where(a => a.OpportunityId == opportunityId)
            .OrderByDescending(a => a.ShiftStartTime)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId, a.VolunteerName, a.OpportunityTitle,
                a.Status, a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();
    }

    public async Task<List<AttendanceSummary>> GetByVolunteerAsync(Guid volunteerId, int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.AttendanceReadModels
            .AsNoTracking()
            .Where(a => a.VolunteerId == volunteerId)
            .OrderByDescending(a => a.CheckInTime)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(a => new AttendanceSummary(
                a.AttendanceId, a.OpportunityId, a.VolunteerId, a.VolunteerName, a.OpportunityTitle,
                a.Status, a.ShiftStartTime, a.CheckInTime, a.CheckOutTime, a.TotalHours))
            .ToListAsync();
    }

    public async Task<List<DisputeSummary>> GetPendingDisputesAsync(int skip = 0, int take = 500)
    {
        var (safeSkip, safeTake) = QueryPaging.Normalize(skip, take);
        return await dbContext.DisputeReadModels
            .AsNoTracking()
            .OrderBy(d => d.RaisedAt)
            .Skip(safeSkip)
            .Take(safeTake)
            .Select(d => new DisputeSummary(
                d.AttendanceId, d.VolunteerId, d.VolunteerName, d.OpportunityTitle,
                d.Reason, d.EvidenceUrl, d.RaisedAt))
            .ToListAsync();
    }
}
