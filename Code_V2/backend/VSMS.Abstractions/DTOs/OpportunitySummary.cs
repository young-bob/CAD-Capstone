using System;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.DTOs;

public record OpportunitySummary(
    Guid OpportunityId,
    Guid OrganizationId,
    string OrganizationName,
    string Title,
    string Category,
    OpportunityStatus Status,
    DateTime PublishDate,
    int TotalSpots,
    int AvailableSpots,
    double? Latitude,
    double? Longitude
);
