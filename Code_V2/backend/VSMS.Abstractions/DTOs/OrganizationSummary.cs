using System;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.DTOs;

public record OrganizationSummary(
    Guid OrgId,
    string Name,
    string Description,
    OrgStatus Status,
    DateTime CreatedAt
);
