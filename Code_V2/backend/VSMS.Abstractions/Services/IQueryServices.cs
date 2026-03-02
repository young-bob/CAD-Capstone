using VSMS.Abstractions.DTOs;

namespace VSMS.Abstractions.Services;

public interface IOrganizationQueryService
{
    Task<List<OrganizationSummary>> GetPendingOrganizationsAsync();
    Task<List<OrganizationSummary>> GetApprovedOrganizationsAsync();
    Task<OrganizationSummary?> GetOrganizationAsync(Guid orgId); // for generic lookups
}

public interface IOpportunityQueryService
{
    Task<List<OpportunitySummary>> SearchPublishedAsync(string? query = null, string? category = null);
    Task<List<OpportunitySummary>> GetByOrganizationAsync(Guid organizationId);
    Task<List<OpportunitySummary>> GetByIdsAsync(IEnumerable<Guid> opportunityIds);
}

public interface IApplicationQueryService
{
    Task<List<ApplicationSummary>> GetByOpportunityAsync(Guid opportunityId);
    Task<List<ApplicationSummary>> GetByVolunteerAsync(Guid volunteerId);
    Task<List<ApplicationSummary>> GetByOrganizationAsync(Guid organizationId);
}

public interface IAttendanceQueryService
{
    Task<List<AttendanceSummary>> GetByOpportunityAsync(Guid opportunityId);
    Task<List<AttendanceSummary>> GetByVolunteerAsync(Guid volunteerId);
    Task<List<DisputeSummary>> GetPendingDisputesAsync();
}
