using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Notifications;

public class NullSearchService : ISearchService
{
    public Task IndexOpportunityAsync(OpportunitySearchDoc doc) => Task.CompletedTask;
    public Task RemoveAsync(Guid opportunityId) => Task.CompletedTask;
    public Task<List<OpportunitySearchDoc>> SearchAsync(string? query, string? category, double? lat, double? lon, double? radiusKm)
        => Task.FromResult(new List<OpportunitySearchDoc>());
}
