using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Admin profile data. One-to-one with UserEntity.
/// The GrainId links to the AdminGrain for distributed actor operations.
/// </summary>
public class AdminEntity
{
    [Key, ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    public UserEntity User { get; set; } = null!;

    /// <summary>Orleans AdminGrain primary key.</summary>
    public Guid GrainId { get; set; } = Guid.NewGuid();
}
