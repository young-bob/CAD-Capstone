using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Thin identity link: maps a UserEntity (auth world) to a CoordinatorGrain (Orleans world).
/// Profile data lives exclusively in CoordinatorGrain state (Orleans is source of truth).
/// OrganizationId is stored here as a query concern — resolves "which coordinators belong
/// to org X?" without activating all coordinator grains (solves the actor island problem).
/// </summary>
public class CoordinatorEntity
{
    [Key, ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    public UserEntity User { get; set; } = null!;

    /// <summary>CoordinatorGrain primary key — the bridge to the Orleans actor world.</summary>
    public Guid GrainId { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Read-side FK: which organization this coordinator belongs to.
    /// Updated by an event handler when CoordinatorGrain.SetOrganization is called.
    /// Multiple coordinators may share the same OrganizationId.
    /// </summary>
    public Guid? OrganizationId { get; set; }
}
