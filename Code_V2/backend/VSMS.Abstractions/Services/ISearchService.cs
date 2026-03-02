namespace VSMS.Abstractions.Services;

public interface ISearchService
{
    Task IndexOpportunityAsync(OpportunitySearchDoc doc);
    Task RemoveAsync(Guid opportunityId);
    Task<List<OpportunitySearchDoc>> SearchAsync(string? query, string? category, double? lat, double? lon, double? radiusKm);
}

public class OpportunitySearchDoc
{
    public Guid OpportunityId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<string> Skills { get; set; } = [];
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int AvailableSpots { get; set; }
}
