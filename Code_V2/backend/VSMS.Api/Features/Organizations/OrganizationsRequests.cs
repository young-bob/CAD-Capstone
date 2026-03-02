using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Organizations;

public record CreateOrgRequest(string Name, string Description, Guid CreatorUserId, string CreatorEmail);
public record CreateOppRequest(string Title, string Description, string Category);
public record InviteMemberRequest(string Email, OrgRole Role);
