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

await app.RunAsync();

public partial class Program { }
