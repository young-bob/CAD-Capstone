using Refit;
using VSMS.VolunteerApp.Models;

namespace VSMS.VolunteerApp.Services;

public interface IVolunteerApiService
{
    // Auth
    [Post("/api/auth/login")]
    Task<AuthResponse> Login([Body] object loginRequest);

    [Post("/api/auth/register")]
    Task Register([Body] object registerRequest);

    // Profile
    [Get("/api/volunteer/{id}")]
    Task<VolunteerProfile> GetProfile(Guid id);

    [Post("/api/volunteer/{id}")]
    Task UpdateProfile(Guid id, [Body] VolunteerProfile profile);

    // Opportunities
    [Get("/api/opportunity")]
    Task<List<OpportunityDetails>> GetOpportunities();

    [Get("/api/opportunity/{id}")]
    Task<OpportunityDetails> GetOpportunity(Guid id);
}
