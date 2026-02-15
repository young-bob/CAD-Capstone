using Refit;
using VSMS.VolunteerApp.Models;

namespace VSMS.VolunteerApp.Services;

public interface IVolunteerApiService
{
    // ==================== Auth ====================
    [Post("/api/Auth/register")]
    Task Register([Body] RegisterRequest request);

    [Post("/api/Auth/login")]
    Task<AuthResponse> Login([Body] LoginRequest request);

    [Post("/api/Auth/logout")]
    Task Logout();

    [Post("/api/Auth/reset-password")]
    Task ResetPassword([Body] ResetPasswordRequest request);

    [Get("/api/Auth/me")]
    Task<UserInfo> GetCurrentUser();

    // ==================== Certificate ====================
    [Post("/api/Certificate/generate")]
    Task GenerateCertificate([Body] CertificateRequest request);

    [Get("/api/Certificate/{id}")]
    Task<CertificateDetails> GetCertificate(Guid id);

    [Get("/api/Certificate/{id}/download")]
    Task<HttpResponseMessage> DownloadCertificate(Guid id);

    [Post("/api/Certificate/{id}/sign")]
    Task SignCertificate(Guid id, [Body] SignatureRequest request);

    // ==================== Coordinator ====================
    [Post("/api/Coordinator/{id}/organization")]
    Task SetCoordinatorOrganization(Guid id, [Body] SetOrganizationRequest request);

    [Post("/api/Coordinator/{id}/shift")]
    Task CreateShift(Guid id, [Body] CreateShiftRequest request);

    [Post("/api/Coordinator/{id}/validate-attendance")]
    Task ValidateAttendance(Guid id, [Body] ValidateAttendanceRequest request);

    // ==================== Opportunity ====================
    [Get("/api/Opportunity/{id}")]
    Task<OpportunityDetails> GetOpportunity(Guid id);

    [Post("/api/Opportunity")]
    Task CreateOpportunity([Body] CreateOpportunityRequest request);

    [Get("/api/Opportunity")]
    Task<List<OpportunityDetails>> GetOpportunities();

    // ==================== Organization ====================
    [Get("/api/Organization/{id}")]
    Task<OrganizationProfile> GetOrganization(string id);

    [Post("/api/Organization/{id}")]
    Task UpdateOrganization(string id, [Body] OrganizationProfile profile);

    [Post("/api/Organization/{id}/verify-credential")]
    Task VerifyCredential(string id, [Body] VerifyCredentialRequest request);

    [Post("/api/Organization/{id}/publish-opportunity")]
    Task PublishOpportunity(string id, [Body] PublishOpportunityRequest request);

    [Get("/api/Organization/{id}/opportunities")]
    Task<List<OpportunityDetails>> GetOrganizationOpportunities(string id);

    // ==================== Skill ====================
    [Get("/api/Skill")]
    Task<List<Skill>> GetSkills();

    [Post("/api/Skill")]
    Task CreateSkill([Body] Skill skill);

    [Get("/api/Skill/{id}")]
    Task<Skill> GetSkill(Guid id);

    [Get("/api/Skill/{id}/volunteers")]
    Task<List<VolunteerProfile>> GetVolunteersBySkill(Guid id);

    [Get("/api/Skill/{id}/opportunities")]
    Task<List<OpportunityDetails>> GetOpportunitiesBySkill(Guid id);

    // ==================== Volunteer ====================
    [Get("/api/Volunteer/{id}")]
    Task<VolunteerProfile> GetVolunteer(Guid id);

    [Post("/api/Volunteer/{id}")]
    Task UpdateVolunteer(Guid id, [Body] VolunteerProfile profile);
}
