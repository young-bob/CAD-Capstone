using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// System-wide skill definition. Skills are seeded/managed by SystemAdmin.
/// Volunteers reference skills via VolunteerSkillEntity (join table).
/// Opportunities reference required skills via OpportunityState.RequiredSkillIds (Grain).
/// </summary>
public class SkillEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Description { get; set; } = string.Empty;
}

