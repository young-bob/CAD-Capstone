using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Data;

public class NullSearchService(ILogger<NullSearchService> logger) : ISearchService
{
    public Task IndexOpportunityAsync(OpportunitySearchDoc doc)
    {
        logger.LogInformation("[Stub] Index opportunity: {Id} - {Title}", doc.OpportunityId, doc.Title);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Guid opportunityId)
    {
        logger.LogInformation("[Stub] Remove from index: {Id}", opportunityId);
        return Task.CompletedTask;
    }

    public Task<List<OpportunitySearchDoc>> SearchAsync(string? query, string? category, double? lat, double? lon, double? radiusKm)
    {
        logger.LogInformation("[Stub] Search: query={Query}, category={Category}", query, category);
        return Task.FromResult(new List<OpportunitySearchDoc>());
    }
}
