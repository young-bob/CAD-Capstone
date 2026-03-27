using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Certificates;

public static class CertificateEndpoints
{
    private const string DefaultSignatoryTitle = "Authorized Organization Representative";

    public static void MapCertificateEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/certificates").WithTags("Certificates").RequireAuthorization();
        var publicGroup = app.MapGroup("/api/certificates").WithTags("Certificates");

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
                .ToListAsync();

            var orgIds = templates
                .Where(t => t.OrganizationId.HasValue && string.IsNullOrWhiteSpace(t.OrganizationName))
                .Select(t => t.OrganizationId!.Value)
                .Distinct()
                .ToList();

            var orgNameMap = orgIds.Count == 0
                ? new Dictionary<Guid, string>()
                : await db.OrganizationReadModels
                    .AsNoTracking()
                    .Where(o => orgIds.Contains(o.OrgId))
                    .ToDictionaryAsync(o => o.OrgId, o => o.Name);

            var result = templates.Select(t => new TemplateListItem(
                t.Id,
                t.Name,
                t.Description,
                t.OrganizationId,
                ResolveOrganizationName(t.OrganizationName, t.OrganizationId, orgNameMap),
                t.TemplateType,
                t.PrimaryColor,
                t.AccentColor,
                t.OrganizationId == null,
                t.SignatoryName,
                t.SignatoryTitle));

            return Results.Ok(result);
        });

        // Get a single template by ID
        group.MapGet("/templates/{templateId:guid}", async (Guid templateId, AppDbContext db) =>
        {
            var t = await db.CertificateTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == templateId);
            if (t is null) return Results.NotFound();

            var orgName = await ResolveOrganizationNameAsync(db, t.OrganizationName, t.OrganizationId);
            if (!string.Equals(orgName, t.OrganizationName, StringComparison.Ordinal))
                t.OrganizationName = orgName;

            return Results.Ok(t);
        });

        // Create a new template (org-specific custom template)
        group.MapPost("/templates", async (CreateTemplateRequest req, AppDbContext db) =>
        {
            var organizationName = await ResolveOrganizationNameAsync(db, req.OrganizationName, req.OrganizationId);

            var entity = new CertificateTemplateEntity
            {
                Name = req.Name,
                Description = req.Description ?? string.Empty,
                OrganizationId = req.OrganizationId,
                OrganizationName = organizationName,
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
            entity.OrganizationName = await ResolveOrganizationNameAsync(db, req.OrganizationName ?? entity.OrganizationName, entity.OrganizationId);
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
            IFileStorageService fileStorage,
            HttpContext http) =>
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

            var resolvedOrganizationName = await ResolveOrganizationNameAsync(db, templateEntity.OrganizationName, templateEntity.OrganizationId);

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

            var volunteerName = $"{profile.FirstName} {profile.LastName}";
            var certificateId = CreatePublicCertificateId();
            var verifyUrl = BuildVerifyUrl(http, certificateId);
            var signatoryName = ResolveSignatoryName(templateEntity.SignatoryName, resolvedOrganizationName);
            var signatoryTitle = ResolveSignatoryTitle(templateEntity.SignatoryTitle);

            var certData = new CertificateData
            {
                VolunteerName = volunteerName,
                TotalHours = profile.TotalHours,
                CompletedOpportunities = profile.CompletedOpportunities,
                OrganizationName = resolvedOrganizationName,
                VolunteerSignatureName = req.VolunteerSignatureName,
                CertificateId = certificateId,
                VerificationUrl = verifyUrl,
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
                        OrganizationName = resolvedOrganizationName ?? string.Empty,
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

            var issuedCertificate = new IssuedCertificateEntity
            {
                CertificateId = certificateId,
                VolunteerId = req.VolunteerId,
                OrganizationId = templateEntity.OrganizationId,
                TemplateId = templateEntity.Id,
                VolunteerName = volunteerName,
                OrganizationName = resolvedOrganizationName ?? string.Empty,
                TemplateName = templateEntity.Name,
                TemplateType = templateEntity.TemplateType,
                TotalHours = profile.TotalHours,
                CompletedOpportunities = profile.CompletedOpportunities,
                VolunteerSignatureName = req.VolunteerSignatureName,
                SignatoryName = signatoryName,
                SignatoryTitle = signatoryTitle,
                FileKey = fileKey,
                FileName = fileName,
                IssuedAt = DateTime.UtcNow,
            };

            db.IssuedCertificates.Add(issuedCertificate);
            await db.SaveChangesAsync();

            // 6. Get presigned URL
            var downloadUrl = await fileStorage.GetUrlAsync(fileKey);

            return Results.Ok(new GenerateCertificateResponse(fileKey, downloadUrl, fileName, certificateId, verifyUrl));
        });

        group.MapPost("/issue", async (
            IssueCertificateRequest req,
            AppDbContext db,
            IGrainFactory grains,
            HttpContext http) =>
        {
            var volunteer = grains.GetGrain<IVolunteerGrain>(req.VolunteerId);
            var profile = await volunteer.GetProfile();

            if (!profile.IsInitialized)
                return Results.BadRequest("Volunteer profile not initialized");

            var templateEntity = await db.CertificateTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == req.TemplateId && t.IsActive);
            if (templateEntity is null)
                return Results.BadRequest("Template not found");

            var resolvedOrganizationName = await ResolveOrganizationNameAsync(db, templateEntity.OrganizationName, templateEntity.OrganizationId);
            var volunteerName = $"{profile.FirstName} {profile.LastName}";
            var certificateId = CreatePublicCertificateId();
            var verifyUrl = BuildVerifyUrl(http, certificateId);

            var issuedCertificate = new IssuedCertificateEntity
            {
                CertificateId = certificateId,
                VolunteerId = req.VolunteerId,
                OrganizationId = templateEntity.OrganizationId,
                TemplateId = templateEntity.Id,
                VolunteerName = volunteerName,
                OrganizationName = resolvedOrganizationName ?? string.Empty,
                TemplateName = templateEntity.Name,
                TemplateType = templateEntity.TemplateType,
                TotalHours = profile.TotalHours,
                CompletedOpportunities = profile.CompletedOpportunities,
                VolunteerSignatureName = req.VolunteerSignatureName,
                SignatoryName = ResolveSignatoryName(templateEntity.SignatoryName, resolvedOrganizationName),
                SignatoryTitle = ResolveSignatoryTitle(templateEntity.SignatoryTitle),
                IssuedAt = DateTime.UtcNow,
            };

            db.IssuedCertificates.Add(issuedCertificate);
            await db.SaveChangesAsync();

            return Results.Ok(new IssueCertificateResponse(certificateId, verifyUrl));
        });

        publicGroup.MapGet("/verify/{certificateId}", async (string certificateId, AppDbContext db) =>
        {
            var issued = await db.IssuedCertificates
                .AsNoTracking()
                .Where(x => x.CertificateId == certificateId)
                .Select(x => new CertificateVerificationResponse(
                    x.CertificateId,
                    !x.IsRevoked,
                    x.IsRevoked,
                    x.RevokedAt,
                    x.VolunteerName,
                    x.OrganizationName,
                    x.TemplateName,
                    x.TemplateType,
                    x.TotalHours,
                    x.CompletedOpportunities,
                    x.IssuedAt,
                    x.SignatoryName,
                    x.SignatoryTitle,
                    x.FileName))
                .FirstOrDefaultAsync();

            return issued is null ? Results.NotFound() : Results.Ok(issued);
        }).AllowAnonymous();

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

    private static async Task<string?> ResolveOrganizationNameAsync(AppDbContext db, string? preferredName, Guid? organizationId)
    {
        if (!string.IsNullOrWhiteSpace(preferredName))
            return preferredName.Trim();

        if (!organizationId.HasValue)
            return preferredName;

        return await db.OrganizationReadModels
            .AsNoTracking()
            .Where(o => o.OrgId == organizationId.Value)
            .Select(o => o.Name)
            .FirstOrDefaultAsync();
    }

    private static string? ResolveOrganizationName(string? preferredName, Guid? organizationId, IReadOnlyDictionary<Guid, string> orgNameMap)
    {
        if (!string.IsNullOrWhiteSpace(preferredName))
            return preferredName;

        if (organizationId.HasValue && orgNameMap.TryGetValue(organizationId.Value, out var name))
            return name;

        return preferredName;
    }

    private static string CreatePublicCertificateId()
    {
        return $"VSMS-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8]}".ToUpperInvariant();
    }

    private static string BuildVerifyUrl(HttpContext http, string certificateId)
    {
        return $"{http.Request.Scheme}://{http.Request.Host}/api/certificates/verify/{Uri.EscapeDataString(certificateId)}";
    }

    private static string ResolveSignatoryName(string? preferredName, string? organizationName)
    {
        return string.IsNullOrWhiteSpace(preferredName)
            ? organizationName?.Trim() ?? string.Empty
            : preferredName.Trim();
    }

    private static string ResolveSignatoryTitle(string? preferredTitle)
    {
        return string.IsNullOrWhiteSpace(preferredTitle)
            ? DefaultSignatoryTitle
            : preferredTitle.Trim();
    }
}

// ==================== Request / Response DTOs ====================

public record TemplateListItem(
    Guid Id, string Name, string Description,
    Guid? OrganizationId, string? OrganizationName,
    string TemplateType, string PrimaryColor, string AccentColor, bool IsSystemPreset,
    string? SignatoryName, string? SignatoryTitle);

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
    Guid TemplateId,
    string? VolunteerSignatureName);

public record GenerateCertificateResponse(
    string FileKey,
    string DownloadUrl,
    string FileName,
    string CertificateId,
    string VerifyUrl);

public record IssueCertificateRequest(
    Guid VolunteerId,
    Guid TemplateId,
    string? VolunteerSignatureName);

public record IssueCertificateResponse(
    string CertificateId,
    string VerifyUrl);

public record CertificateVerificationResponse(
    string CertificateId,
    bool IsValid,
    bool IsRevoked,
    DateTime? RevokedAt,
    string VolunteerName,
    string OrganizationName,
    string TemplateName,
    string TemplateType,
    double TotalHours,
    int CompletedOpportunities,
    DateTime IssuedAt,
    string? SignatoryName,
    string? SignatoryTitle,
    string? FileName);
