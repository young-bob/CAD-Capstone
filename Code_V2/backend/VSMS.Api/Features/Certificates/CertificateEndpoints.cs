using System.Net;
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
            HttpContext http,
            IConfiguration config) =>
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
            var verifyUrl = BuildVerifyUrl(config, http, certificateId);
            var signatoryName = ResolveSignatoryName(templateEntity.SignatoryName, resolvedOrganizationName);
            var signatoryTitle = ResolveSignatoryTitle(templateEntity.SignatoryTitle);

            var confirmedActivities = await db.AttendanceReadModels
                .AsNoTracking()
                .Where(a => a.VolunteerId == req.VolunteerId &&
                    a.Status == Abstractions.Enums.AttendanceStatus.Confirmed &&
                    a.TotalHours > 0)
                .OrderByDescending(a => a.CheckOutTime ?? a.CheckInTime ?? a.ShiftStartTime)
                .Select(a => new CertificateActivity
                {
                    Title = a.OpportunityTitle,
                    OrganizationName = resolvedOrganizationName ?? string.Empty,
                    CompletedAt = a.CheckOutTime ?? a.CheckInTime ?? a.ShiftStartTime,
                    Hours = a.TotalHours
                })
                .ToListAsync();

            var confirmedTotalHours = confirmedActivities.Sum(a => a.Hours);

            var certData = new CertificateData
            {
                VolunteerName = volunteerName,
                TotalHours = confirmedTotalHours,
                CompletedOpportunities = confirmedActivities.Count,
                OrganizationName = resolvedOrganizationName,
                VolunteerSignatureName = req.VolunteerSignatureName,
                CertificateId = certificateId,
                VerificationUrl = verifyUrl,
                Activities = confirmedActivities,
            };

            // 4. Generate PDF
            var pdfBytes = await certService.GeneratePdfAsync(certData, templateInfo);

            // 5. Store in MinIO
            using var stream = new MemoryStream(pdfBytes);
            var fileName = $"{templateEntity.TemplateType}_{DateTime.UtcNow:yyMMddHHmmss}_{profile.FirstName}_{profile.LastName}.pdf";
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
                TotalHours = confirmedTotalHours,
                CompletedOpportunities = confirmedActivities.Count,
                VolunteerSignatureName = req.VolunteerSignatureName,
                SignatoryName = signatoryName,
                SignatoryTitle = signatoryTitle,
                FileKey = fileKey,
                FileName = fileName,
                IssuedAt = DateTime.UtcNow,
            };

            db.IssuedCertificates.Add(issuedCertificate);
            await db.SaveChangesAsync();

            // 6. Build a download URL that proxies through the API (avoids exposing internal MinIO hostname)
            var downloadUrl = BuildDownloadUrl(config, http, fileKey);

            return Results.Ok(new GenerateCertificateResponse(fileKey, downloadUrl, fileName, certificateId, verifyUrl));
        });

        group.MapPost("/issue", async (
            IssueCertificateRequest req,
            AppDbContext db,
            IGrainFactory grains,
            HttpContext http,
            IConfiguration config) =>
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
            var verifyUrl = BuildVerifyUrl(config, http, certificateId);

            var issueConfirmedHours = await db.AttendanceReadModels
                .AsNoTracking()
                .Where(a => a.VolunteerId == req.VolunteerId &&
                    a.Status == Abstractions.Enums.AttendanceStatus.Confirmed &&
                    a.TotalHours > 0)
                .SumAsync(a => a.TotalHours);

            var issueConfirmedCount = await db.AttendanceReadModels
                .AsNoTracking()
                .CountAsync(a => a.VolunteerId == req.VolunteerId &&
                    a.Status == Abstractions.Enums.AttendanceStatus.Confirmed &&
                    a.TotalHours > 0);

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
                TotalHours = issueConfirmedHours,
                CompletedOpportunities = issueConfirmedCount,
                VolunteerSignatureName = req.VolunteerSignatureName,
                SignatoryName = ResolveSignatoryName(templateEntity.SignatoryName, resolvedOrganizationName),
                SignatoryTitle = ResolveSignatoryTitle(templateEntity.SignatoryTitle),
                IssuedAt = DateTime.UtcNow,
            };

            db.IssuedCertificates.Add(issuedCertificate);
            await db.SaveChangesAsync();

            return Results.Ok(new IssueCertificateResponse(certificateId, verifyUrl));
        });

        publicGroup.MapGet("/verify/{certificateId}", async (string certificateId, AppDbContext db, HttpContext http) =>
        {
            var issued = await db.IssuedCertificates
                .AsNoTracking()
                .Where(x => x.CertificateId == certificateId)
                .Select(x => new CertificateVerificationResponse(
                    x.CertificateId,
                    !x.IsRevoked,
                    x.IsRevoked,
                    x.RevokedAt,
                    x.VolunteerName ?? string.Empty,
                    x.OrganizationName ?? string.Empty,
                    x.TemplateName ?? string.Empty,
                    x.TemplateType ?? CertificateTemplateTypes.AchievementCertificate,
                    x.TotalHours,
                    x.CompletedOpportunities,
                    x.IssuedAt,
                    x.SignatoryName,
                    x.SignatoryTitle,
                    x.FileName))
                .FirstOrDefaultAsync();

            if (PrefersHtml(http))
            {
                if (issued is null)
                {
                    return Results.Content(BuildVerificationNotFoundHtml(certificateId), "text/html");
                }

                return Results.Content(BuildVerificationHtml(issued), "text/html");
            }

            return issued is null ? Results.NotFound() : Results.Ok(issued);
        }).AllowAnonymous();

        // Download a certificate PDF through the API (no auth — fileKey UUID acts as capability token)
        publicGroup.MapGet("/download/{*fileKey}", async (string fileKey, IFileStorageService fileStorage) =>
        {
            try
            {
                var normalizedKey = Uri.UnescapeDataString(fileKey).TrimStart('/');
                var (content, contentType) = await fileStorage.DownloadAsync(normalizedKey);
                var fileName = Path.GetFileName(normalizedKey);
                return Results.File(content, contentType, fileDownloadName: fileName, enableRangeProcessing: true);
            }
            catch
            {
                return Results.NotFound();
            }
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

    private static string BuildVerifyUrl(IConfiguration config, HttpContext http, string certificateId)
    {
        var configuredBaseUrl = config["App:PublicBaseUrl"];
        var baseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl)
            ? $"{http.Request.Scheme}://{http.Request.Host}"
            : configuredBaseUrl.Trim().TrimEnd('/');

        return $"{baseUrl}/api/certificates/verify/{Uri.EscapeDataString(certificateId)}";
    }

    private static string BuildDownloadUrl(IConfiguration config, HttpContext http, string fileKey)
    {
        var configuredBaseUrl = config["App:PublicBaseUrl"];
        var baseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl)
            ? $"{http.Request.Scheme}://{http.Request.Host}"
            : configuredBaseUrl.Trim().TrimEnd('/');

        // fileKey contains slashes (e.g. "certificates/uuid_name.pdf") — include as path segments
        return $"{baseUrl}/api/certificates/download/{fileKey}";
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

    private static bool PrefersHtml(HttpContext http)
    {
        var accept = http.Request.Headers.Accept.ToString();
        return string.IsNullOrWhiteSpace(accept)
            || accept.Contains("text/html", StringComparison.OrdinalIgnoreCase)
            || accept.Contains("*/*", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildVerificationHtml(CertificateVerificationResponse issued)
    {
        var statusLabel = issued.IsValid ? "Valid Certificate" : "Certificate Revoked";
        var statusColor = issued.IsValid ? "#166534" : "#991B1B";
        var statusBg = issued.IsValid ? "#DCFCE7" : "#FEE2E2";
        var statusBorder = issued.IsValid ? "#86EFAC" : "#FCA5A5";
        var orgName = Html(issued.OrganizationName);
        var volunteerName = Html(issued.VolunteerName);
        var templateName = Html(issued.TemplateName);
        var templateType = issued.TemplateType == CertificateTemplateTypes.HoursLog ? "Hours Log" : "Certificate";
        var signatoryName = string.IsNullOrWhiteSpace(issued.SignatoryName) ? "Not specified" : Html(issued.SignatoryName);
        var signatoryTitle = string.IsNullOrWhiteSpace(issued.SignatoryTitle) ? DefaultSignatoryTitle : Html(issued.SignatoryTitle);
        var revokedText = issued.RevokedAt.HasValue ? issued.RevokedAt.Value.ToString("yyyy-MM-dd HH:mm 'UTC'") : "N/A";
        var revokedLabel = issued.IsRevoked ? "Yes" : "No";
        var issuedDate = issued.IssuedAt.ToString("yyyy-MM-dd");
        var issuedTime = issued.IssuedAt.ToString("HH:mm 'UTC'");

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
  <title>Certificate Verification</title>
  <style>
    :root{{--ink:#0f172a;--muted:#64748b;--line:#dbe4f0;--panel:#ffffff;--bg1:#f8fafc;--bg2:#e0f2fe;--accent:#0f766e;}}
    *{{box-sizing:border-box}} body{{margin:0;font-family:Segoe UI,Arial,sans-serif;color:var(--ink);background:
    radial-gradient(circle at top left,#dbeafe 0,#f8fafc 35%),
    linear-gradient(135deg,var(--bg1),var(--bg2));min-height:100vh;padding:32px 16px}}
    .shell{{max-width:860px;margin:0 auto}}
    .hero{{background:rgba(255,255,255,.82);backdrop-filter:blur(8px);border:1px solid rgba(219,228,240,.9);border-radius:28px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)}}
    .eyebrow{{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:10px}}
    h1{{margin:0 0 12px;font-size:34px}}
    .lead{{margin:0;color:var(--muted);font-size:15px;line-height:1.6}}
    .status{{display:inline-block;margin-top:20px;padding:10px 14px;border-radius:999px;font-weight:700;font-size:14px;background:{statusBg};color:{statusColor};border:1px solid {statusBorder}}}
    .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:24px}}
    .card{{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px}}
    .label{{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}}
    .value{{font-size:20px;font-weight:700;line-height:1.3}}
    .sub{{font-size:14px;color:var(--muted);margin-top:6px;line-height:1.5}}
    .wide{{margin-top:16px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:22px}}
    .meta{{display:grid;grid-template-columns:1fr 1fr;gap:18px 24px}}
    .meta-item{{min-width:0}}
    .meta-value{{font-size:15px;font-weight:600;word-break:break-word}}
    .foot{{margin-top:16px;font-size:13px;color:var(--muted)}}
    @media (max-width:640px){{body{{padding:18px 10px}}.hero{{padding:20px}}.meta{{grid-template-columns:1fr}}h1{{font-size:28px}}}}
  </style>
</head>
<body>
  <div class=""shell"">
    <div class=""hero"">
      <div class=""eyebrow"">VSMS Verification Portal</div>
      <h1>Certificate Verification</h1>
      <p class=""lead"">This page confirms whether the certificate ID below matches a document issued through the VSMS platform.</p>
      <div class=""status"">{statusLabel}</div>

      <div class=""grid"">
        <div class=""card"">
          <div class=""label"">Certificate ID</div>
          <div class=""value"">{Html(issued.CertificateId)}</div>
          <div class=""sub"">{templateType}</div>
        </div>
        <div class=""card"">
          <div class=""label"">Volunteer</div>
          <div class=""value"">{volunteerName}</div>
          <div class=""sub"">{orgName}</div>
        </div>
        <div class=""card"">
          <div class=""label"">Issued At</div>
          <div class=""value"">{issuedDate}</div>
          <div class=""sub"">{issuedTime}</div>
        </div>
        <div class=""card"">
          <div class=""label"">Verified Hours</div>
          <div class=""value"">{issued.TotalHours:F1}</div>
          <div class=""sub"">{issued.CompletedOpportunities} completed opportunities</div>
        </div>
      </div>

      <div class=""wide"">
        <div class=""meta"">
          <div class=""meta-item"">
            <div class=""label"">Template</div>
            <div class=""meta-value"">{templateName}</div>
          </div>
          <div class=""meta-item"">
            <div class=""label"">Organization</div>
            <div class=""meta-value"">{orgName}</div>
          </div>
          <div class=""meta-item"">
            <div class=""label"">Signatory</div>
            <div class=""meta-value"">{signatoryName}</div>
          </div>
          <div class=""meta-item"">
            <div class=""label"">Signatory Title</div>
            <div class=""meta-value"">{signatoryTitle}</div>
          </div>
          <div class=""meta-item"">
            <div class=""label"">Revoked</div>
            <div class=""meta-value"">{revokedLabel}</div>
          </div>
          <div class=""meta-item"">
            <div class=""label"">Revoked At</div>
            <div class=""meta-value"">{revokedText}</div>
          </div>
        </div>
      </div>

      <div class=""foot"">If this information does not match the document you received, treat the certificate as unverified.</div>
    </div>
  </div>
</body>
</html>";
    }

    private static string BuildVerificationNotFoundHtml(string certificateId)
    {
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
  <title>Certificate Not Found</title>
  <style>
    body{{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;padding:24px}}
    .card{{max-width:640px;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.08)}}
    .tag{{display:inline-block;padding:8px 12px;border-radius:999px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:13px;margin-bottom:14px}}
    h1{{margin:0 0 12px;font-size:30px}} p{{margin:0;color:#64748b;line-height:1.7}} .id{{margin-top:18px;font-family:Consolas,monospace;font-size:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}}
  </style>
</head>
<body>
  <div class=""card"">
    <div class=""tag"">Certificate Not Found</div>
    <h1>We couldn't verify this certificate.</h1>
    <p>No issued certificate record was found for the ID below. Double-check the certificate ID or treat the document as unverified.</p>
    <div class=""id"">{Html(certificateId)}</div>
  </div>
</body>
</html>";
    }

    private static string Html(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
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
