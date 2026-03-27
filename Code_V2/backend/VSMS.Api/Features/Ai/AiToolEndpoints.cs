using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Orleans.Runtime;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Ai;

public static class AiToolEndpoints
{
    private static readonly HashSet<string> VolunteerTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "search_opportunities",
        "recommend_opportunities",
        "get_opportunity_detail",
        "get_my_applications",
        "get_my_attendance",
        "get_my_profile",
        "get_my_skills",
        "get_notifications",
        "get_unread_notification_count",
        "get_certificate_templates",
        "verify_certificate_public",
        "get_org_announcements",
    };

    private static readonly HashSet<string> CoordinatorTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "search_opportunities",
        "get_opportunity_detail",
        "get_org_state",
        "get_org_opportunities",
        "get_org_applications",
        "get_opportunity_attendance",
        "get_org_volunteers",
        "get_org_event_templates",
        "get_event_tasks",
        "get_skill_catalog",
        "get_certificate_templates",
        "verify_certificate_public",
    };

    private static readonly HashSet<string> AdminTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin_get_system_info",
        "admin_get_grain_distribution",
        "admin_get_users",
        "admin_get_pending_orgs",
        "admin_get_pending_disputes",
        "search_opportunities",
        "get_opportunity_detail",
        "get_skill_catalog",
        "get_certificate_templates",
        "verify_certificate_public",
    };

    private sealed record ToolDefinition(string Name, string Description, string[] Roles);

    private static readonly ToolDefinition[] ToolCatalog =
    [
        new("search_opportunities", "Search published opportunities by query/category.", ["Volunteer", "Coordinator", "SystemAdmin"]),
        new("recommend_opportunities", "Recommend opportunities for current volunteer by skills/distance.", ["Volunteer"]),
        new("get_opportunity_detail", "Get opportunity write-side state by opportunity id.", ["Volunteer", "Coordinator", "SystemAdmin"]),
        new("get_my_applications", "Get current volunteer applications.", ["Volunteer"]),
        new("get_my_attendance", "Get current volunteer attendance records.", ["Volunteer"]),
        new("get_my_profile", "Get current volunteer profile.", ["Volunteer"]),
        new("get_my_skills", "Get current volunteer skills with names/categories.", ["Volunteer"]),
        new("get_notifications", "Get current volunteer notifications.", ["Volunteer"]),
        new("get_unread_notification_count", "Get unread notification count for current volunteer.", ["Volunteer"]),
        new("get_org_announcements", "Get organization announcements.", ["Volunteer"]),
        new("get_org_state", "Get organization state for managed org.", ["Coordinator"]),
        new("get_org_opportunities", "Get opportunities for managed org.", ["Coordinator"]),
        new("get_org_applications", "Get applications for managed org.", ["Coordinator"]),
        new("get_opportunity_attendance", "Get attendance records for managed opportunity.", ["Coordinator"]),
        new("get_org_volunteers", "Get volunteers engaged/following managed org.", ["Coordinator"]),
        new("get_org_event_templates", "Get event templates for managed org.", ["Coordinator"]),
        new("get_event_tasks", "Get task list for managed opportunity.", ["Coordinator"]),
        new("get_skill_catalog", "Get global skill catalog.", ["Coordinator", "SystemAdmin"]),
        new("get_certificate_templates", "Get active certificate templates (system + optional org).", ["Volunteer", "Coordinator", "SystemAdmin"]),
        new("verify_certificate_public", "Verify certificate by public certificate id.", ["Volunteer", "Coordinator", "SystemAdmin"]),
        new("admin_get_system_info", "Get Orleans system info summary.", ["SystemAdmin"]),
        new("admin_get_grain_distribution", "Get Orleans grain distribution by silo/type.", ["SystemAdmin"]),
        new("admin_get_users", "Get users list with basic filters.", ["SystemAdmin"]),
        new("admin_get_pending_orgs", "Get pending organizations.", ["SystemAdmin"]),
        new("admin_get_pending_disputes", "Get pending disputes.", ["SystemAdmin"]),
    ];

    public static void MapAiToolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai").WithTags("AI").RequireAuthorization();

        group.MapGet("/tools", (HttpContext http) =>
        {
            var tools = ResolveAllowedTools(http);
            var result = ToolCatalog
                .Where(t => tools.Contains(t.Name))
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    tool = t.Name,
                    description = t.Description,
                    roles = t.Roles
                })
                .ToList();

            return Results.Ok(new
            {
                role = GetRole(http),
                total = result.Count,
                tools = result
            });
        });

        group.MapPost("/tools/run", async (
            RunAiToolRequest req,
            HttpContext http,
            AppDbContext db,
            IGrainFactory grains,
            IOrganizationQueryService organizationQueryService,
            IOpportunityQueryService opportunityQueryService,
            IApplicationQueryService applicationQueryService,
            IAttendanceQueryService attendanceQueryService) =>
        {
            if (string.IsNullOrWhiteSpace(req.Tool))
                return Results.BadRequest(new { error = "Tool is required." });

            var allowedTools = ResolveAllowedTools(http);
            if (!allowedTools.Contains(req.Tool))
                return Results.Forbid();

            try
            {
                var data = await ExecuteToolAsync(
                    req.Tool.Trim(),
                    req.Arguments,
                    http,
                    db,
                    grains,
                    organizationQueryService,
                    opportunityQueryService,
                    applicationQueryService,
                    attendanceQueryService);

                return Results.Ok(new
                {
                    tool = req.Tool.Trim(),
                    ok = true,
                    data
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }

    private static async Task<object?> ExecuteToolAsync(
        string tool,
        JsonElement arguments,
        HttpContext http,
        AppDbContext db,
        IGrainFactory grains,
        IOrganizationQueryService organizationQueryService,
        IOpportunityQueryService opportunityQueryService,
        IApplicationQueryService applicationQueryService,
        IAttendanceQueryService attendanceQueryService)
    {
        switch (tool.ToLowerInvariant())
        {
            case "search_opportunities":
            {
                var query = GetOptionalString(arguments, "query");
                var category = GetOptionalString(arguments, "category");
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await opportunityQueryService.SearchPublishedAsync(query, category, skip, take);
            }

            case "recommend_opportunities":
            {
                if (!http.TryGetUserId(out var callerUserId))
                    throw new UnauthorizedAccessException();

                var volunteer = await db.Volunteers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.UserId == callerUserId);
                if (volunteer is null)
                    throw new InvalidOperationException("Current user is not a volunteer.");

                var volunteerSkillIds = await grains.GetGrain<IVolunteerGrain>(volunteer.GrainId).GetSkillIds();
                var volunteerSkillSet = volunteerSkillIds.ToHashSet();

                var lat = GetOptionalDouble(arguments, "lat");
                var lon = GetOptionalDouble(arguments, "lon");
                var query = GetOptionalString(arguments, "query");
                var category = GetOptionalString(arguments, "category");
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);

                var opportunitiesQuery = db.OpportunityReadModels
                    .AsNoTracking()
                    .Where(o => o.Status == OpportunityStatus.Published && o.AvailableSpots > 0);

                if (!string.IsNullOrWhiteSpace(query))
                {
                    var qLower = query.Trim().ToLowerInvariant();
                    opportunitiesQuery = opportunitiesQuery.Where(o =>
                        o.Title.ToLower().Contains(qLower) || o.OrganizationName.ToLower().Contains(qLower));
                }

                if (!string.IsNullOrWhiteSpace(category))
                    opportunitiesQuery = opportunitiesQuery.Where(o => o.Category == category);

                var opportunities = await opportunitiesQuery.ToListAsync();
                var now = DateTime.UtcNow;

                var ranked = opportunities
                    .Select(o =>
                    {
                        var requiredSkillIds = o.RequiredSkillIds ?? [];
                        var requiredSkillCount = requiredSkillIds.Count;
                        var matchedSkillCount = requiredSkillCount == 0
                            ? 0
                            : requiredSkillIds.Count(id => volunteerSkillSet.Contains(id));

                        var skillMatchRatio = requiredSkillCount == 0
                            ? 0.6
                            : (double)matchedSkillCount / requiredSkillCount;

                        var distanceKm = lat.HasValue && lon.HasValue && o.Latitude.HasValue && o.Longitude.HasValue
                            ? HaversineKm(lat.Value, lon.Value, o.Latitude.Value, o.Longitude.Value)
                            : (double?)null;

                        var distanceScore = distanceKm.HasValue ? DistanceScore(distanceKm.Value) : 0.5;
                        var ageDays = Math.Max(0, (now - o.PublishDate).TotalDays);
                        var freshnessScore = Math.Max(0.1, 1.0 - (ageDays / 30.0));
                        var recommendationScore = (skillMatchRatio * 0.65) + (distanceScore * 0.30) + (freshnessScore * 0.05);

                        return new
                        {
                            o.OpportunityId,
                            o.OrganizationId,
                            o.OrganizationName,
                            o.Title,
                            o.Category,
                            o.Status,
                            o.PublishDate,
                            o.TotalSpots,
                            o.AvailableSpots,
                            o.Latitude,
                            o.Longitude,
                            matchedSkillCount,
                            requiredSkillCount,
                            skillMatchRatio = Math.Round(skillMatchRatio, 4),
                            distanceKm = distanceKm.HasValue ? Math.Round(distanceKm.Value, 2) : (double?)null,
                            recommendationScore = Math.Round(recommendationScore, 4),
                            o.RequiredSkillIds
                        };
                    })
                    .OrderByDescending(x => x.recommendationScore)
                    .ThenByDescending(x => x.matchedSkillCount)
                    .ThenBy(x => x.distanceKm ?? double.MaxValue)
                    .ThenByDescending(x => x.PublishDate)
                    .Skip(skip)
                    .Take(take)
                    .ToList();

                return new
                {
                    volunteerSkillCount = volunteerSkillIds.Count,
                    opportunities = ranked
                };
            }

            case "get_opportunity_detail":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                return await grains.GetGrain<IOpportunityGrain>(opportunityId).GetState();
            }

            case "get_my_applications":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await applicationQueryService.GetByVolunteerAsync(callerGrainId, skip, take);
            }

            case "get_my_attendance":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await attendanceQueryService.GetByVolunteerAsync(callerGrainId, skip, take);
            }

            case "get_my_profile":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();
                return await grains.GetGrain<IVolunteerGrain>(callerGrainId).GetProfile();
            }

            case "get_my_skills":
            {
                if (!http.TryGetUserId(out var callerUserId))
                    throw new UnauthorizedAccessException();

                var volunteer = await db.Volunteers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(v => v.UserId == callerUserId);
                if (volunteer is null)
                    throw new InvalidOperationException("Current user is not a volunteer.");

                var skillIds = await grains.GetGrain<IVolunteerGrain>(volunteer.GrainId).GetSkillIds();
                var skills = await db.Skills
                    .AsNoTracking()
                    .Where(s => skillIds.Contains(s.Id))
                    .OrderBy(s => s.Category)
                    .ThenBy(s => s.Name)
                    .Select(s => new { s.Id, s.Name, s.Category, s.Description })
                    .ToListAsync();

                return new { skillIds, skills };
            }

            case "get_notifications":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var limit = Clamp(GetOptionalInt(arguments, "limit", 50), 1, 100);
                return await db.Notifications
                    .AsNoTracking()
                    .Where(n => n.VolunteerGrainId == callerGrainId)
                    .OrderByDescending(n => n.SentAt)
                    .Take(limit)
                    .Select(n => new
                    {
                        n.Id,
                        n.Title,
                        n.Message,
                        n.SenderName,
                        n.SentAt,
                        n.IsRead
                    })
                    .ToListAsync();
            }

            case "get_unread_notification_count":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var count = await db.Notifications
                    .AsNoTracking()
                    .CountAsync(n => n.VolunteerGrainId == callerGrainId && !n.IsRead);
                return new { count };
            }

            case "get_org_announcements":
            {
                var orgId = GetRequiredGuid(arguments, "organizationId");
                return await grains.GetGrain<IOrganizationGrain>(orgId).GetAnnouncements();
            }

            case "get_org_state":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                return await grains.GetGrain<IOrganizationGrain>(orgId).GetState();
            }

            case "get_org_opportunities":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await opportunityQueryService.GetByOrganizationAsync(orgId, skip, take);
            }

            case "get_org_applications":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await applicationQueryService.GetByOrganizationAsync(orgId, skip, take);
            }

            case "get_opportunity_attendance":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await attendanceQueryService.GetByOpportunityAsync(opportunityId, skip, take);
            }

            case "get_org_volunteers":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                return await BuildOrganizationVolunteerViewAsync(orgId, db, grains);
            }

            case "get_org_event_templates":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                return await db.EventTemplates
                    .AsNoTracking()
                    .Where(t => t.OrganizationId == orgId)
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new
                    {
                        t.Id,
                        t.Name,
                        t.Title,
                        t.Description,
                        t.Category,
                        t.TagsJson,
                        t.ApprovalPolicy,
                        t.RequiredSkillIdsJson,
                        t.Latitude,
                        t.Longitude,
                        t.RadiusMeters,
                        t.CreatedAt
                    })
                    .ToListAsync();
            }

            case "get_event_tasks":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                return await db.EventTasks
                    .AsNoTracking()
                    .Where(t => t.OpportunityId == opportunityId)
                    .OrderBy(t => t.IsCompleted)
                    .ThenByDescending(t => t.CreatedAt)
                    .ToListAsync();
            }

            case "get_skill_catalog":
            {
                return await db.Skills
                    .AsNoTracking()
                    .OrderBy(s => s.Category)
                    .ThenBy(s => s.Name)
                    .Select(s => new { s.Id, s.Name, s.Category, s.Description })
                    .ToListAsync();
            }

            case "get_certificate_templates":
            {
                var organizationId = GetOptionalGuid(arguments, "organizationId");
                var query = db.CertificateTemplates
                    .AsNoTracking()
                    .Where(t => t.IsActive);

                if (organizationId.HasValue)
                    query = query.Where(t => t.OrganizationId == null || t.OrganizationId == organizationId);

                return await query
                    .OrderBy(t => t.OrganizationId == null ? 0 : 1)
                    .ThenBy(t => t.Name)
                    .Select(t => new
                    {
                        t.Id,
                        t.Name,
                        t.Description,
                        t.OrganizationId,
                        t.OrganizationName,
                        t.TemplateType,
                        t.PrimaryColor,
                        t.AccentColor,
                        isSystemPreset = t.OrganizationId == null,
                        t.SignatoryName,
                        t.SignatoryTitle
                    })
                    .ToListAsync();
            }

            case "verify_certificate_public":
            {
                var certificateId = GetRequiredString(arguments, "certificateId");
                var issued = await db.IssuedCertificates
                    .AsNoTracking()
                    .Where(x => x.CertificateId == certificateId)
                    .Select(x => new
                    {
                        x.CertificateId,
                        isValid = !x.IsRevoked,
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
                        x.FileName
                    })
                    .FirstOrDefaultAsync();

                if (issued is null)
                    throw new ArgumentException("Certificate not found.");
                return issued;
            }

            case "admin_get_system_info":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                return await BuildAdminSystemInfoAsync(grains);
            }

            case "admin_get_grain_distribution":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                return await BuildAdminGrainDistributionAsync(grains);
            }

            case "admin_get_users":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();

                var role = GetOptionalString(arguments, "role");
                var search = GetOptionalString(arguments, "search");
                var status = GetOptionalString(arguments, "status");
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);

                var q = db.Users
                    .AsNoTracking()
                    .Where(u => u.Role != "SystemAdmin")
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(role))
                    q = q.Where(u => u.Role == role);
                if (!string.IsNullOrWhiteSpace(search))
                    q = q.Where(u => u.Email.Contains(search));
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
                        q = q.Where(u => !u.IsBanned);
                    if (status.Equals("banned", StringComparison.OrdinalIgnoreCase))
                        q = q.Where(u => u.IsBanned);
                }

                return await q.OrderByDescending(u => u.CreatedAt)
                    .Skip(skip)
                    .Take(take)
                    .Select(u => new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt })
                    .ToListAsync();
            }

            case "admin_get_pending_orgs":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await organizationQueryService.GetPendingOrganizationsAsync(skip, take);
            }

            case "admin_get_pending_disputes":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await attendanceQueryService.GetPendingDisputesAsync(skip, take);
            }

            default:
                throw new ArgumentException($"Unknown tool: {tool}");
        }
    }

    private static async Task<object> BuildAdminGrainDistributionAsync(IGrainFactory grains)
    {
        var management = grains.GetGrain<IManagementGrain>(0);
        var stats = await management.GetSimpleGrainStatistics();

        var rows = stats
            .Select(s => new
            {
                silo = s.SiloAddress?.ToString() ?? "unknown",
                grainType = s.GrainType?.ToString() ?? "unknown",
                activations = (long)s.ActivationCount
            })
            .ToList();

        var bySilo = rows
            .GroupBy(x => x.silo)
            .Select(g => new
            {
                silo = g.Key,
                totalActivations = g.Sum(x => x.activations),
                grainTypes = g.GroupBy(x => x.grainType)
                    .Select(t => new
                    {
                        grainType = t.Key,
                        activations = t.Sum(x => x.activations),
                        isSystem = t.Key.StartsWith("Orleans.", StringComparison.OrdinalIgnoreCase)
                    })
                    .OrderByDescending(t => t.activations)
                    .ToList()
            })
            .OrderByDescending(x => x.totalActivations)
            .ToList();

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            totalSilos = bySilo.Count,
            totalActivations = rows.Sum(x => x.activations),
            silos = bySilo
        };
    }

    private static async Task<object> BuildAdminSystemInfoAsync(IGrainFactory grains)
    {
        var management = grains.GetGrain<IManagementGrain>(0);
        var hosts = await management.GetHosts(onlyActive: true);
        var stats = await management.GetSimpleGrainStatistics();

        var hostStatus = hosts.ToDictionary(
            x => x.Key.ToString(),
            x => x.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        var bySilo = stats
            .GroupBy(s => s.SiloAddress?.ToString() ?? "unknown")
            .Select(g =>
            {
                var rows = g.ToList();
                var total = rows.Sum(x => (long)x.ActivationCount);
                var system = rows
                    .Where(x => (x.GrainType?.ToString() ?? "unknown").StartsWith("Orleans.", StringComparison.OrdinalIgnoreCase))
                    .Sum(x => (long)x.ActivationCount);

                return new
                {
                    silo = g.Key,
                    status = hostStatus.TryGetValue(g.Key, out var st) ? st : "Unknown",
                    isAlive = hostStatus.TryGetValue(g.Key, out var s) && s.Equals("Active", StringComparison.OrdinalIgnoreCase),
                    totalActivations = total,
                    systemActivations = system,
                    businessActivations = Math.Max(0, total - system),
                };
            })
            .OrderByDescending(x => x.totalActivations)
            .ToList();

        var totals = bySilo.Select(x => x.totalActivations).ToList();
        var max = totals.Count == 0 ? 0 : totals.Max();
        var min = totals.Count == 0 ? 0 : totals.Min();

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            totalSilos = bySilo.Count,
            totalActivations = totals.Sum(),
            silos = bySilo,
            skew = new
            {
                maxActivations = max,
                minActivations = min,
                skewRatio = min > 0 ? Math.Round((double)max / min, 4) : (double?)null
            }
        };
    }

    private static async Task<List<object>> BuildOrganizationVolunteerViewAsync(Guid orgId, AppDbContext db, IGrainFactory grains)
    {
        var orgOppIds = await db.OpportunityReadModels
            .AsNoTracking()
            .Where(o => o.OrganizationId == orgId)
            .Select(o => o.OpportunityId)
            .ToListAsync();

        var engagedIds = await db.ApplicationReadModels
            .AsNoTracking()
            .Where(a => orgOppIds.Contains(a.OpportunityId) &&
                        a.Status != ApplicationStatus.Rejected)
            .Select(a => a.VolunteerId)
            .Distinct()
            .ToListAsync();

        var orgHoursMap = await db.AttendanceReadModels
            .AsNoTracking()
            .Where(a => orgOppIds.Contains(a.OpportunityId) && a.TotalHours > 0)
            .GroupBy(a => a.VolunteerId)
            .Select(g => new { VolunteerId = g.Key, Hours = g.Sum(a => a.TotalHours), Events = g.Count() })
            .ToDictionaryAsync(x => x.VolunteerId, x => (x.Hours, x.Events));

        var followerIds = await db.VolunteerFollows
            .AsNoTracking()
            .Where(f => f.OrgId == orgId)
            .Select(f => f.VolunteerGrainId)
            .ToListAsync();

        var allIds = new Dictionary<Guid, string>();
        foreach (var gid in engagedIds) allIds[gid] = "Engaged";
        foreach (var gid in followerIds)
        {
            if (allIds.ContainsKey(gid)) allIds[gid] = "Both";
            else allIds[gid] = "Following";
        }

        var profileTasks = allIds.Keys.Select(async gid =>
        {
            try
            {
                var profile = await grains.GetGrain<IVolunteerGrain>(gid).GetProfile();
                var (hours, events) = orgHoursMap.TryGetValue(gid, out var h) ? h : (0.0, 0);
                return (object)new
                {
                    grainId = gid,
                    name = $"{profile.FirstName} {profile.LastName}".Trim(),
                    profile.Email,
                    relationship = allIds[gid],
                    orgHours = Math.Round(hours, 2),
                    orgEventsAttended = events,
                    profile.BackgroundCheckStatus,
                    hasWaiver = profile.WaiverSignedAt.HasValue,
                    skillCount = profile.SkillIds.Count
                };
            }
            catch
            {
                return null;
            }
        });

        var results = await Task.WhenAll(profileTasks);
        return results.Where(x => x is not null).Cast<object>().ToList();
    }

    private static async Task EnsureCanManageOrganization(HttpContext http, AppDbContext db, Guid orgId)
    {
        var canManage = await http.CanManageOrganizationAsync(db, orgId);
        if (!canManage) throw new UnauthorizedAccessException();
    }

    private static async Task<Guid> ResolveManagedOrganizationIdAsync(HttpContext http, AppDbContext db, JsonElement arguments)
    {
        var requestedOrgId = GetOptionalGuid(arguments, "organizationId");
        if (requestedOrgId.HasValue)
            return requestedOrgId.Value;

        if (!http.TryGetUserId(out var callerUserId))
            throw new UnauthorizedAccessException();

        var orgId = await db.Coordinators
            .AsNoTracking()
            .Where(c => c.UserId == callerUserId)
            .Select(c => c.OrganizationId)
            .FirstOrDefaultAsync();

        if (!orgId.HasValue || orgId == Guid.Empty)
            throw new ArgumentException("organizationId is required for this tool.");

        return orgId.Value;
    }

    private static HashSet<string> ResolveAllowedTools(HttpContext http)
    {
        if (http.IsSystemAdmin())
            return AdminTools;
        if (http.IsCoordinator())
            return CoordinatorTools;
        if (http.IsVolunteer())
            return VolunteerTools;
        return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    private static string GetRole(HttpContext http)
    {
        if (http.IsSystemAdmin()) return "SystemAdmin";
        if (http.IsCoordinator()) return "Coordinator";
        if (http.IsVolunteer()) return "Volunteer";
        return "Unknown";
    }

    private static string GetRequiredString(JsonElement args, string name)
    {
        var value = GetOptionalString(args, name);
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{name} is required.");
        return value.Trim();
    }

    private static string? GetOptionalString(JsonElement args, string name)
    {
        if (args.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
        if (args.ValueKind != JsonValueKind.Object) return null;
        if (!args.TryGetProperty(name, out var node)) return null;
        return node.ValueKind == JsonValueKind.String ? node.GetString() : node.ToString();
    }

    private static int GetOptionalInt(JsonElement args, string name, int defaultValue)
    {
        if (args.ValueKind != JsonValueKind.Object) return defaultValue;
        if (!args.TryGetProperty(name, out var node)) return defaultValue;
        if (node.ValueKind == JsonValueKind.Number && node.TryGetInt32(out var i)) return i;
        if (node.ValueKind == JsonValueKind.String && int.TryParse(node.GetString(), out var parsed)) return parsed;
        return defaultValue;
    }

    private static double? GetOptionalDouble(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object) return null;
        if (!args.TryGetProperty(name, out var node)) return null;
        if (node.ValueKind == JsonValueKind.Number && node.TryGetDouble(out var d)) return d;
        if (node.ValueKind == JsonValueKind.String && double.TryParse(node.GetString(), out var parsed)) return parsed;
        return null;
    }

    private static Guid GetRequiredGuid(JsonElement args, string name)
    {
        var value = GetOptionalGuid(args, name);
        if (!value.HasValue || value == Guid.Empty)
            throw new ArgumentException($"{name} is required.");
        return value.Value;
    }

    private static Guid? GetOptionalGuid(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object) return null;
        if (!args.TryGetProperty(name, out var node)) return null;
        if (node.ValueKind == JsonValueKind.String && Guid.TryParse(node.GetString(), out var id)) return id;
        if (node.ValueKind == JsonValueKind.Null) return null;
        return null;
    }

    private static int Clamp(int value, int min, int max) => Math.Max(min, Math.Min(max, value));

    private static double DistanceScore(double distanceKm)
    {
        if (distanceKm <= 2) return 1.0;
        if (distanceKm <= 5) return 0.85;
        if (distanceKm <= 10) return 0.7;
        if (distanceKm <= 20) return 0.5;
        if (distanceKm <= 40) return 0.25;
        return 0.1;
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private static double ToRadians(double degrees) => degrees * (Math.PI / 180.0);
}

public sealed record RunAiToolRequest(string Tool, JsonElement Arguments);
