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
using VSMS.Api.Features.Volunteers;
using VSMS.Api.Middleware;
using VSMS.Infrastructure.Data.EfCoreQuery;

var builder = WebApplication.CreateBuilder(args);

// ==================== Service Registrations ====================
builder.AddJwtAuthentication();
builder.AddDatabase();
builder.AddOrleansCluster();
builder.AddApplicationServices();
builder.AddSwagger();

// Serialize enums as strings (e.g. "Approved" instead of 1)
builder.Services.ConfigureHttpJsonOptions(opts =>
    opts.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

var app = builder.Build();

// ==================== Middleware ====================
app.UseExceptionHandler(); // Uses GlobalExceptionHandler

app.UseSwagger();
app.UseSwaggerUI();

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

// ==================== Database Init & Admin Seed ====================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
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
