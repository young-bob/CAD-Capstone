using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Thin identity link: maps a UserEntity (auth world) to a VolunteerGrain (Orleans world).
/// Profile data lives exclusively in VolunteerGrain state (Orleans is source of truth).
/// This entity exists only for query purposes (audit, admin listing, ban enforcement).
/// </summary>
public class VolunteerEntity
{
    [Key, ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    public UserEntity User { get; set; } = null!;

    /// <summary>VolunteerGrain primary key — the bridge to the Orleans actor world.</summary>
    public Guid GrainId { get; set; } = Guid.NewGuid();
}
