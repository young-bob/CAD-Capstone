using Microsoft.EntityFrameworkCore;
using VSMS.Api.Extensions;
using VSMS.Api.Features.Admin;
using VSMS.Api.Features.Applications;
using VSMS.Api.Features.Attendance;
using VSMS.Api.Features.Auth;
using VSMS.Api.Features.Certificates;
using VSMS.Api.Features.Coordinators;
using VSMS.Api.Features.Files;
using VSMS.Api.Features.Opportunities;
using VSMS.Api.Features.Organizations;
using VSMS.Api.Features.Skills;
using VSMS.Api.Features.Ai;
using VSMS.Api.Features.Notifications;
using VSMS.Api.Features.Volunteers;
using VSMS.Api.Features.EventTasks;
using VSMS.Api.Middleware;
using VSMS.Infrastructure.Data.EfCoreQuery;

var builder = WebApplication.CreateBuilder(args);

// ==================== Service Registrations ====================
builder.AddJwtAuthentication();
builder.AddDatabase();
builder.AddOrleansCluster();
builder.AddApplicationServices();
builder.AddSwagger();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:8081")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Serialize enums as strings (e.g. "Approved" instead of 1)
builder.Services.ConfigureHttpJsonOptions(opts =>
    opts.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

var app = builder.Build();

// ==================== Middleware ====================
app.UseExceptionHandler(); // Uses GlobalExceptionHandler

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<VSMS.Api.Middleware.BanCheckMiddleware>();

// ==================== Endpoints ====================
app.MapAuthEndpoints();
app.MapVolunteerEndpoints();
app.MapOrganizationEndpoints();
app.MapOpportunityEndpoints();
app.MapApplicationEndpoints();
app.MapAttendanceEndpoints();
app.MapAdminEndpoints();
app.MapFileEndpoints();
app.MapCertificateEndpoints();
app.MapCoordinatorEndpoints();
app.MapSkillEndpoints();
app.MapNotificationEndpoints();
app.MapEventTaskEndpoints();
app.MapAiToolEndpoints();
app.MapAiChatEndpoints();

// ==================== Database Init & Admin Seed ====================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await ApplySchemaPatchesAsync(db);
    await ApplyPerformanceIndexesAsync(db);

    // Seed default SystemAdmin if none exists
    if (!await db.Users.AnyAsync(u => u.Role == "SystemAdmin"))
    {
        var adminUser = new VSMS.Infrastructure.Data.EfCoreQuery.Entities.UserEntity
        {
            Email = "admin@vsms.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "SystemAdmin",
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();
        db.Admins.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.AdminEntity
        {
            UserId = adminUser.Id,
            GrainId = Guid.NewGuid()
        });
        await db.SaveChangesAsync();
        app.Logger.LogInformation("Default SystemAdmin seeded: admin@vsms.com / Admin@123");
    }
}

static async Task ApplySchemaPatchesAsync(AppDbContext db)
{
    if (!db.Database.IsNpgsql()) return;

    // Idempotent patches — safe to run on both fresh and existing databases.
    // Covers schema added by EF migrations that EnsureCreatedAsync would skip.
    var statements = new[]
    {
        // AddVolunteerFollowTable
        """
        CREATE TABLE IF NOT EXISTS "VolunteerFollows" (
            "VolunteerGrainId" uuid NOT NULL,
            "OrgId"            uuid NOT NULL,
            "FollowedAt"       timestamp with time zone NOT NULL,
            CONSTRAINT "PK_VolunteerFollows" PRIMARY KEY ("VolunteerGrainId", "OrgId")
        );
        """,
        """CREATE INDEX IF NOT EXISTS "IX_VolunteerFollows_OrgId" ON "VolunteerFollows" ("OrgId");""",

        // AddOrgProfileAndAnnouncements
        """ALTER TABLE "OrganizationReadModels" ADD COLUMN IF NOT EXISTS "WebsiteUrl"             character varying(500);""",
        """ALTER TABLE "OrganizationReadModels" ADD COLUMN IF NOT EXISTS "ContactEmail"           character varying(256);""",
        """ALTER TABLE "OrganizationReadModels" ADD COLUMN IF NOT EXISTS "Tags"                   text[] NOT NULL DEFAULT '{{}}';""",
        """ALTER TABLE "OrganizationReadModels" ADD COLUMN IF NOT EXISTS "LatestAnnouncementText" character varying(600);""",
        """ALTER TABLE "OrganizationReadModels" ADD COLUMN IF NOT EXISTS "LatestAnnouncementAt"   timestamp with time zone;""",

        // AddNotifications
        """
        CREATE TABLE IF NOT EXISTS "Notifications" (
            "Id"               uuid NOT NULL,
            "VolunteerGrainId" uuid NOT NULL,
            "Title"            character varying(200) NOT NULL,
            "Message"          text NOT NULL,
            "SenderName"       character varying(200),
            "SentAt"           timestamp with time zone NOT NULL,
            "IsRead"           boolean NOT NULL DEFAULT false,
            CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id")
        );
        """,
        """CREATE INDEX IF NOT EXISTS "IX_Notifications_VolunteerGrainId_SentAt" ON "Notifications" ("VolunteerGrainId", "SentAt" DESC);""",

        // AddEventTasks
        """
        CREATE TABLE IF NOT EXISTS "EventTasks" (
            "Id"                  uuid NOT NULL,
            "OpportunityId"       uuid NOT NULL,
            "OrganizationId"      uuid NOT NULL,
            "Title"               character varying(200) NOT NULL,
            "Note"                character varying(1000),
            "AssignedToGrainId"   uuid,
            "AssignedToEmail"     character varying(256),
            "AssignedToName"      character varying(200),
            "IsCompleted"         boolean NOT NULL DEFAULT false,
            "CreatedByGrainId"    uuid NOT NULL,
            "CreatedByEmail"      character varying(256),
            "CreatedAt"           timestamp with time zone NOT NULL,
            "CompletedAt"         timestamp with time zone,
            CONSTRAINT "PK_EventTasks" PRIMARY KEY ("Id")
        );
        """,
        """CREATE INDEX IF NOT EXISTS "IX_EventTasks_OpportunityId" ON "EventTasks" ("OpportunityId");""",
        """CREATE INDEX IF NOT EXISTS "IX_EventTasks_OrganizationId" ON "EventTasks" ("OrganizationId");""",
    };

    foreach (var sql in statements)
        await db.Database.ExecuteSqlRawAsync(sql);
}

static async Task ApplyPerformanceIndexesAsync(AppDbContext db)
{
    if (!db.Database.IsNpgsql()) return;

    var statements = new[]
    {
        """CREATE INDEX IF NOT EXISTS "IX_Users_Role_CreatedAt" ON "Users" ("Role", "CreatedAt");""",
        """CREATE INDEX IF NOT EXISTS "IX_Users_IsBanned" ON "Users" ("IsBanned");""",
        """CREATE INDEX IF NOT EXISTS "IX_OrganizationReadModels_Status_CreatedAt" ON "OrganizationReadModels" ("Status", "CreatedAt");""",
        """CREATE INDEX IF NOT EXISTS "IX_OpportunityReadModels_Status_PublishDate" ON "OpportunityReadModels" ("Status", "PublishDate");""",
        """CREATE INDEX IF NOT EXISTS "IX_ApplicationReadModels_OpportunityId_AppliedAt" ON "ApplicationReadModels" ("OpportunityId", "AppliedAt");""",
        """CREATE INDEX IF NOT EXISTS "IX_ApplicationReadModels_VolunteerId_AppliedAt" ON "ApplicationReadModels" ("VolunteerId", "AppliedAt");""",
        """CREATE INDEX IF NOT EXISTS "IX_AttendanceReadModels_VolunteerId_CheckInTime" ON "AttendanceReadModels" ("VolunteerId", "CheckInTime");""",
        """CREATE INDEX IF NOT EXISTS "IX_AttendanceReadModels_OpportunityId_ShiftStartTime" ON "AttendanceReadModels" ("OpportunityId", "ShiftStartTime");""",
        """CREATE INDEX IF NOT EXISTS "IX_DisputeReadModels_RaisedAt" ON "DisputeReadModels" ("RaisedAt");""",
    };

    foreach (var sql in statements)
    {
        await db.Database.ExecuteSqlRawAsync(sql);
    }
}

await app.RunAsync();

public partial class Program { }
