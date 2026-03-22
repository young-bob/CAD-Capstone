using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Organizations;

public record CreateOrgRequest(string Name, string Description, Guid CreatorUserId, string CreatorEmail, string? ProofUrl = null);
public record ResubmitOrgRequest(string Name, string Description, string? ProofUrl = null);
public record CreateOppRequest(string Title, string Description, string Category);
public record InviteMemberRequest(string Email, OrgRole Role);

public record SaveEventTemplateRequest(
    string Name,
    string Title,
    string Description,
    string Category,
    string[] Tags,
    string ApprovalPolicy,
    string[] RequiredSkillIds,
    double? Latitude,
    double? Longitude,
    int? RadiusMeters
);
