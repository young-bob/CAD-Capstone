using System;
using System.ComponentModel.DataAnnotations;
using VSMS.Abstractions.Enums;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class OpportunityReadModel
{
    [Key]
    public Guid OpportunityId { get; set; }
    public Guid OrganizationId { get; set; }

    [MaxLength(100)]
    public string OrganizationName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    public OpportunityStatus Status { get; set; }
    public DateTime PublishDate { get; set; }
    public int TotalSpots { get; set; }
    public int AvailableSpots { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    /// <summary>
    /// Skill IDs required for this opportunity — read-side projection of OpportunityState.RequiredSkillIds.
    /// Updated by OpportunityEventHandlers when OpportunitySkillsUpdatedEvent is received.
    /// Stored as JSON for fast contains/intersection queries.
    /// </summary>
    public List<Guid> RequiredSkillIds { get; set; } = [];

    /// <summary>
    /// The latest EndTime across all shifts. Null if no shifts have been added.
    /// Used to hide opportunities where all shifts are in the past.
    /// </summary>
    public DateTime? LatestShiftEndTime { get; set; }
}
