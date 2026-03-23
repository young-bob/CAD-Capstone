using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Infrastructure.Data.EfCoreQuery;

/// <summary>
/// EF Core context — read/query side only (CQRS).
/// Orleans Grains are the write-side / source of truth for all domain data.
/// Entities here are either:
///   (a) Auth entities (UserEntity + thin role-link tables): bridge between auth world and Orleans world
///   (b) Read model projections: updated by event handlers, never written directly from API
///   (c) Catalogues (SkillEntity): system-managed lookup data
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── Auth / Identity bridge ──
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<VolunteerEntity> Volunteers => Set<VolunteerEntity>();   // thin: UserId + GrainId
    public DbSet<CoordinatorEntity> Coordinators => Set<CoordinatorEntity>(); // thin: UserId + GrainId + OrganizationId
    public DbSet<AdminEntity> Admins => Set<AdminEntity>();               // thin: UserId + GrainId

    // ── Catalogues (system-managed, not actor-owned) ──
    public DbSet<SkillEntity> Skills => Set<SkillEntity>();

    // ── Read model projections (CQRS query side, updated by event handlers) ──
    public DbSet<OrganizationReadModel> OrganizationReadModels => Set<OrganizationReadModel>();
    public DbSet<OpportunityReadModel> OpportunityReadModels => Set<OpportunityReadModel>();
    public DbSet<ApplicationReadModel> ApplicationReadModels => Set<ApplicationReadModel>();
    public DbSet<AttendanceReadModel> AttendanceReadModels => Set<AttendanceReadModel>();
    public DbSet<DisputeReadModel> DisputeReadModels => Set<DisputeReadModel>();
    public DbSet<CertificateTemplateEntity> CertificateTemplates => Set<CertificateTemplateEntity>();
    public DbSet<EventTemplateEntity> EventTemplates => Set<EventTemplateEntity>();
    public DbSet<VolunteerFollowEntity> VolunteerFollows => Set<VolunteerFollowEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<EventTaskEntity> EventTasks => Set<EventTaskEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => new { e.Role, e.CreatedAt }).HasDatabaseName("IX_Users_Role_CreatedAt");
            entity.HasIndex(e => e.IsBanned).HasDatabaseName("IX_Users_IsBanned");

            // 1:1 parent → child link tables (cascade delete cleans up link when user is deleted)
            entity.HasOne(u => u.VolunteerProfile)
                  .WithOne(v => v.User)
                  .HasForeignKey<VolunteerEntity>(v => v.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(u => u.CoordinatorProfile)
                  .WithOne(c => c.User)
                  .HasForeignKey<CoordinatorEntity>(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(u => u.AdminProfile)
                  .WithOne(a => a.User)
                  .HasForeignKey<AdminEntity>(a => a.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Index: fast "all coordinators in org X" query without activating grains
        modelBuilder.Entity<CoordinatorEntity>()
            .HasIndex(c => c.OrganizationId);

        // Skill catalogue: unique name
        modelBuilder.Entity<SkillEntity>()
            .HasIndex(s => s.Name).IsUnique();

        // ── CQRS read model indexes ──
        modelBuilder.Entity<OrganizationReadModel>().HasIndex(o => o.Status);
        modelBuilder.Entity<OrganizationReadModel>()
            .HasIndex(o => new { o.Status, o.CreatedAt })
            .HasDatabaseName("IX_OrganizationReadModels_Status_CreatedAt");

        modelBuilder.Entity<OpportunityReadModel>().HasIndex(o => o.Status);
        modelBuilder.Entity<OpportunityReadModel>().HasIndex(o => o.OrganizationId);
        modelBuilder.Entity<OpportunityReadModel>().HasIndex(o => o.Category);
        modelBuilder.Entity<OpportunityReadModel>()
            .HasIndex(o => new { o.Status, o.PublishDate })
            .HasDatabaseName("IX_OpportunityReadModels_Status_PublishDate");

        // RequiredSkillIds stored as JSON column for list-contains queries
        // ValueComparer required so EF Core can detect changes in the List<Guid> collection
        var guidListComparer = new ValueComparer<List<Guid>>(
            (a, b) => a != null && b != null && a.SequenceEqual(b),
            c => c.Aggregate(0, (hash, id) => HashCode.Combine(hash, id.GetHashCode())),
            c => c.ToList());

        modelBuilder.Entity<OpportunityReadModel>()
            .Property(o => o.RequiredSkillIds)
            .HasColumnType("jsonb")  // PostgreSQL JSONB — falls back to TEXT on SQLite
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<Guid>())
            .Metadata.SetValueComparer(guidListComparer);

        modelBuilder.Entity<ApplicationReadModel>().HasIndex(a => a.OpportunityId);
        modelBuilder.Entity<ApplicationReadModel>().HasIndex(a => a.VolunteerId);
        modelBuilder.Entity<ApplicationReadModel>()
            .HasIndex(a => new { a.OpportunityId, a.AppliedAt })
            .HasDatabaseName("IX_ApplicationReadModels_OpportunityId_AppliedAt");
        modelBuilder.Entity<ApplicationReadModel>()
            .HasIndex(a => new { a.VolunteerId, a.AppliedAt })
            .HasDatabaseName("IX_ApplicationReadModels_VolunteerId_AppliedAt");

        modelBuilder.Entity<AttendanceReadModel>().HasIndex(a => a.OpportunityId);
        modelBuilder.Entity<AttendanceReadModel>()
            .HasIndex(a => new { a.VolunteerId, a.CheckInTime })
            .HasDatabaseName("IX_AttendanceReadModels_VolunteerId_CheckInTime");
        modelBuilder.Entity<AttendanceReadModel>()
            .HasIndex(a => new { a.OpportunityId, a.ShiftStartTime })
            .HasDatabaseName("IX_AttendanceReadModels_OpportunityId_ShiftStartTime");

        modelBuilder.Entity<DisputeReadModel>().HasIndex(a => a.VolunteerId);
        modelBuilder.Entity<DisputeReadModel>()
            .HasIndex(a => a.RaisedAt)
            .HasDatabaseName("IX_DisputeReadModels_RaisedAt");

        modelBuilder.Entity<CertificateTemplateEntity>().HasIndex(t => t.OrganizationId);
        modelBuilder.Entity<EventTemplateEntity>().HasIndex(t => t.OrganizationId);

        modelBuilder.Entity<VolunteerFollowEntity>()
            .HasKey(f => new { f.VolunteerGrainId, f.OrgId });
        modelBuilder.Entity<VolunteerFollowEntity>()
            .HasIndex(f => f.OrgId)
            .HasDatabaseName("IX_VolunteerFollows_OrgId");

        modelBuilder.Entity<NotificationEntity>()
            .HasIndex(n => new { n.VolunteerGrainId, n.SentAt })
            .HasDatabaseName("IX_Notifications_VolunteerGrainId_SentAt");

        modelBuilder.Entity<EventTaskEntity>().HasIndex(t => t.OpportunityId);
        modelBuilder.Entity<EventTaskEntity>().HasIndex(t => t.OrganizationId);
    }
}
