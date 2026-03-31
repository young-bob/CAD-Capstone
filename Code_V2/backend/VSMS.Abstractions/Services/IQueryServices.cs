using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.Services;

public interface IOrganizationQueryService
{
    Task<List<OrganizationSummary>> GetPendingOrganizationsAsync(int skip = 0, int take = 500);
    Task<List<OrganizationSummary>> GetApprovedOrganizationsAsync(int skip = 0, int take = 500);
    Task<List<OrganizationSummary>> GetAllOrganizationsAsync(OrgStatus? status = null, int skip = 0, int take = 500);
    Task<OrganizationSummary?> GetOrganizationAsync(Guid orgId); // for generic lookups
}

public interface IOpportunityQueryService
{
    Task<List<OpportunitySummary>> SearchPublishedAsync(string? query = null, string? category = null, int skip = 0, int take = 500);
    Task<List<OpportunitySummary>> GetByOrganizationAsync(Guid organizationId, OpportunityStatus? status = null, int skip = 0, int take = 500);
    Task<List<OpportunitySummary>> GetByIdsAsync(IEnumerable<Guid> opportunityIds);
}

public interface IApplicationQueryService
{
    Task<List<ApplicationSummary>> GetByOpportunityAsync(Guid opportunityId, ApplicationStatus? status = null, int skip = 0, int take = 500);
    Task<List<ApplicationSummary>> GetByVolunteerAsync(Guid volunteerId, ApplicationStatus? status = null, int skip = 0, int take = 500);
    Task<List<ApplicationSummary>> GetByOrganizationAsync(Guid organizationId, ApplicationStatus? status = null, int skip = 0, int take = 500);
}

public interface IAttendanceQueryService
{
    Task<List<AttendanceSummary>> GetByOpportunityAsync(Guid opportunityId, AttendanceStatus? status = null, int skip = 0, int take = 500);
    Task<List<AttendanceSummary>> GetByVolunteerAsync(Guid volunteerId, AttendanceStatus? status = null, int skip = 0, int take = 500);
    Task<List<DisputeSummary>> GetPendingDisputesAsync(int skip = 0, int take = 500);
}
