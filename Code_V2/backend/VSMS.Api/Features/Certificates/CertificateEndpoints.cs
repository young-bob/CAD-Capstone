using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Certificates;

public static class CertificateEndpoints
{
    public static void MapCertificateEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/certificates").WithTags("Certificates").RequireAuthorization();

        // ==================== Template Management ====================

        // Get all available templates (system presets + org-specific)
        group.MapGet("/templates", async (Guid? organizationId, AppDbContext db) =>
        {
            var query = db.CertificateTemplates
                .AsNoTracking()
                .Where(t => t.IsActive);

            if (organizationId.HasValue)
            {
                query = query.Where(t => t.OrganizationId == null || t.OrganizationId == organizationId);
            }

            var templates = await query
                .OrderBy(t => t.OrganizationId == null ? 0 : 1) // System presets first
                .ThenBy(t => t.Name)
                .Select(t => new TemplateListItem(
                    t.Id, t.Name, t.Description, t.OrganizationId, t.OrganizationName,
                    t.TemplateType, t.PrimaryColor, t.AccentColor, t.OrganizationId == null))
                .ToListAsync();

            return Results.Ok(templates);
        });

        // Get a single template by ID
        group.MapGet("/templates/{templateId:guid}", async (Guid templateId, AppDbContext db) =>
        {
            var t = await db.CertificateTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == templateId);
            if (t is null) return Results.NotFound();
            return Results.Ok(t);
        });

        // Create a new template (org-specific custom template)
        group.MapPost("/templates", async (CreateTemplateRequest req, AppDbContext db) =>
        {
            var entity = new CertificateTemplateEntity
            {
                Name = req.Name,
                Description = req.Description ?? string.Empty,
                OrganizationId = req.OrganizationId,
                OrganizationName = req.OrganizationName,
                TemplateType = NormalizeTemplateType(req.TemplateType, req.TitleText),
                LogoFileKey = req.LogoFileKey,
                BackgroundFileKey = req.BackgroundFileKey,
                PrimaryColor = req.PrimaryColor ?? "#1A237E",
                AccentColor = req.AccentColor ?? "#C5A23E",
                TitleText = req.TitleText,
                BodyTemplate = req.BodyTemplate,
                SignatoryName = req.SignatoryName,
                SignatoryTitle = req.SignatoryTitle,
            };

            db.CertificateTemplates.Add(entity);
            await db.SaveChangesAsync();

            return Results.Created($"/api/certificates/templates/{entity.Id}", new { id = entity.Id });
        });

        // Update an existing template
        group.MapPut("/templates/{templateId:guid}", async (Guid templateId, UpdateTemplateRequest req, AppDbContext db) =>
        {
            var entity = await db.CertificateTemplates.FindAsync(templateId);
            if (entity is null) return Results.NotFound();

            entity.Name = req.Name ?? entity.Name;
            entity.Description = req.Description ?? entity.Description;
            entity.OrganizationName = req.OrganizationName ?? entity.OrganizationName;
            entity.TemplateType = NormalizeTemplateType(req.TemplateType, req.TitleText, entity.TemplateType);
            entity.LogoFileKey = req.LogoFileKey ?? entity.LogoFileKey;
            entity.BackgroundFileKey = req.BackgroundFileKey ?? entity.BackgroundFileKey;
            entity.PrimaryColor = req.PrimaryColor ?? entity.PrimaryColor;
            entity.AccentColor = req.AccentColor ?? entity.AccentColor;
            entity.TitleText = req.TitleText ?? entity.TitleText;
            entity.BodyTemplate = req.BodyTemplate ?? entity.BodyTemplate;
            entity.SignatoryName = req.SignatoryName ?? entity.SignatoryName;
            entity.SignatoryTitle = req.SignatoryTitle ?? entity.SignatoryTitle;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Delete (soft-delete) a template
        group.MapDelete("/templates/{templateId:guid}", async (Guid templateId, AppDbContext db) =>
        {
            var entity = await db.CertificateTemplates.FindAsync(templateId);
            if (entity is null) return Results.NotFound();

            entity.IsActive = false;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ==================== Certificate Generation ====================

        // Generate a PDF certificate for a volunteer
        group.MapPost("/generate", async (
            GenerateCertificateRequest req,
            AppDbContext db,
            IGrainFactory grains,
            ICertificateService certService,
            IFileStorageService fileStorage) =>
        {
            // 1. Get volunteer data
            var volunteer = grains.GetGrain<IVolunteerGrain>(req.VolunteerId);
            var profile = await volunteer.GetProfile();

            if (!profile.IsInitialized)
                return Results.BadRequest("Volunteer profile not initialized");

            // 2. Load template
            var templateEntity = await db.CertificateTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == req.TemplateId);
            if (templateEntity is null)
                return Results.BadRequest("Template not found");

            // 3. Optionally load logo bytes from MinIO
            byte[]? logoBytes = null;
            if (!string.IsNullOrEmpty(templateEntity.LogoFileKey))
            {
                // For simplicity, we skip downloading the logo from MinIO in the PDF
                // (QuestPDF needs raw bytes, and we'd need a stream download API)
            }

            var templateInfo = new CertificateTemplateInfo
            {
                Name = templateEntity.Name,
                TemplateType = templateEntity.TemplateType,
                PrimaryColor = templateEntity.PrimaryColor,
                AccentColor = templateEntity.AccentColor,
                TitleText = templateEntity.TitleText,
                BodyTemplate = templateEntity.BodyTemplate,
                SignatoryName = templateEntity.SignatoryName,
                SignatoryTitle = templateEntity.SignatoryTitle,
                LogoBytes = logoBytes,
            };

            var certData = new CertificateData
            {
                VolunteerName = $"{profile.FirstName} {profile.LastName}",
                TotalHours = profile.TotalHours,
                CompletedOpportunities = profile.CompletedOpportunities,
                OrganizationName = templateEntity.OrganizationName,
                Activities = await db.AttendanceReadModels
                    .AsNoTracking()
                    .Where(a => a.VolunteerId == req.VolunteerId &&
                        (a.Status == Abstractions.Enums.AttendanceStatus.Confirmed ||
                         a.Status == Abstractions.Enums.AttendanceStatus.CheckedOut) &&
                        a.TotalHours > 0)
                    .OrderByDescending(a => a.CheckOutTime ?? a.CheckInTime ?? a.ShiftStartTime)
                    .Select(a => new CertificateActivity
                    {
                        Title = a.OpportunityTitle,
                        OrganizationName = templateEntity.OrganizationName ?? string.Empty,
                        CompletedAt = a.CheckOutTime ?? a.CheckInTime ?? a.ShiftStartTime,
                        Hours = a.TotalHours
                    })
                    .ToListAsync(),
            };

            // 4. Generate PDF
            var pdfBytes = await certService.GeneratePdfAsync(certData, templateInfo);

            // 5. Store in MinIO
            using var stream = new MemoryStream(pdfBytes);
            var fileName = $"cert_{profile.FirstName}_{profile.LastName}_{DateTime.UtcNow:yyyyMMdd}.pdf";
            var fileKey = await fileStorage.UploadAsync(stream, fileName, "certificates");

            // 6. Get presigned URL
            var downloadUrl = await fileStorage.GetUrlAsync(fileKey);

            return Results.Ok(new { fileKey, downloadUrl, fileName });
        });

        // Seed system preset templates (call once during initial setup)
        group.MapPost("/seed-presets", async (AppDbContext db) =>
        {
            if (await db.CertificateTemplates.AnyAsync(t => t.OrganizationId == null))
                return Results.Ok("System presets already exist");

            var presets = new[]
            {
                new CertificateTemplateEntity
                {
                    Name = "Elegant Navy",
                    Description = "Classic navy blue with gold accents",
                    TemplateType = CertificateTemplateTypes.AchievementCertificate,
                    PrimaryColor = "#1A237E",
                    AccentColor = "#C5A23E",
                    TitleText = "Certificate of Volunteer Service",
                },
                new CertificateTemplateEntity
                {
                    Name = "Modern Teal",
                    Description = "Contemporary teal with silver accents",
                    TemplateType = CertificateTemplateTypes.AchievementCertificate,
                    PrimaryColor = "#00695C",
                    AccentColor = "#90A4AE",
                    TitleText = "Volunteer Achievement Certificate",
                },
                new CertificateTemplateEntity
                {
                    Name = "Warm Burgundy",
                    Description = "Warm burgundy with copper accents",
                    TemplateType = CertificateTemplateTypes.AchievementCertificate,
                    PrimaryColor = "#880E4F",
                    AccentColor = "#D4A574",
                    TitleText = "Certificate of Appreciation",
                },
                new CertificateTemplateEntity
                {
                    Name = "Verified Hours Log",
                    Description = "Structured school-friendly volunteer hours log",
                    TemplateType = CertificateTemplateTypes.HoursLog,
                    PrimaryColor = "#1F4E79",
                    AccentColor = "#5B8FB9",
                    TitleText = "Community Involvement Hours Log",
                },
            };

            db.CertificateTemplates.AddRange(presets);
            await db.SaveChangesAsync();
            return Results.Ok($"Seeded {presets.Length} system preset templates");
        });
    }

    private static string NormalizeTemplateType(string? templateType, string? legacyTitleText, string? fallback = null)
    {
        var normalized = (templateType ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized == CertificateTemplateTypes.AchievementCertificate || normalized == CertificateTemplateTypes.HoursLog)
            return normalized;

        if (string.Equals(legacyTitleText, "tracking", StringComparison.OrdinalIgnoreCase))
            return CertificateTemplateTypes.HoursLog;

        return fallback ?? CertificateTemplateTypes.AchievementCertificate;
    }
}

// ==================== Request / Response DTOs ====================

public record TemplateListItem(
    Guid Id, string Name, string Description,
    Guid? OrganizationId, string? OrganizationName,
    string TemplateType, string PrimaryColor, string AccentColor, bool IsSystemPreset);

public record CreateTemplateRequest(
    string Name, string? Description,
    Guid? OrganizationId, string? OrganizationName,
    string? TemplateType,
    string? LogoFileKey, string? BackgroundFileKey,
    string? PrimaryColor, string? AccentColor,
    string? TitleText, string? BodyTemplate,
    string? SignatoryName, string? SignatoryTitle);

public record UpdateTemplateRequest(
    string? Name, string? Description,
    string? OrganizationName, string? TemplateType,
    string? LogoFileKey, string? BackgroundFileKey,
    string? PrimaryColor, string? AccentColor,
    string? TitleText, string? BodyTemplate,
    string? SignatoryName, string? SignatoryTitle);

public record GenerateCertificateRequest(
    Guid VolunteerId,
    Guid TemplateId);
