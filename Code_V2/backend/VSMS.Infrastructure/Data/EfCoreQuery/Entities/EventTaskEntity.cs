using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class EventTaskEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OpportunityId { get; set; }
    public Guid OrganizationId { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Note { get; set; }

    /// <summary>Coordinator grain ID this task is assigned to (null = unassigned).</summary>
    public Guid? AssignedToGrainId { get; set; }

    [MaxLength(256)]
    public string? AssignedToEmail { get; set; }

    [MaxLength(200)]
    public string? AssignedToName { get; set; }

    public bool IsCompleted { get; set; } = false;

    public Guid CreatedByGrainId { get; set; }

    [MaxLength(256)]
    public string? CreatedByEmail { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
