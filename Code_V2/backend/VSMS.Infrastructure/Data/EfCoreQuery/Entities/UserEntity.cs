using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

/// <summary>
/// Base user account — authentication and role identity only.
/// Profile data lives in the corresponding child entity (VolunteerEntity, CoordinatorEntity, AdminEntity).
/// </summary>
public class UserEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Volunteer"; // Volunteer | Coordinator | SystemAdmin

    /// <summary>Set to true when a SystemAdmin bans this user. Enforced by BanCheckMiddleware.</summary>
    public bool IsBanned { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation properties (one of these will be non-null depending on Role) ──
    public VolunteerEntity? VolunteerProfile { get; set; }
    public CoordinatorEntity? CoordinatorProfile { get; set; }
    public AdminEntity? AdminProfile { get; set; }
}

