using Refit;
using VSMS.VolunteerApp.Models;

namespace VSMS.VolunteerApp.Services;

public interface IVolunteerApiService
{
    // Auth
    [Post("/api/auth/login")]
    Task<string> Login([Body] object loginRequest);

    // Profile
    // [Get("/api/volunteer/profile")]
    // Task<VolunteerProfile> GetProfile();

    // Opportunities
    [Get("/api/opportunities")]
    Task<List<OpportunityDetails>> GetOpportunities();
}
