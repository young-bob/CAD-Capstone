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
        "volunteer_apply_shift",
        "volunteer_withdraw_application",
        "volunteer_geo_checkin",
        "volunteer_checkout",
        "volunteer_raise_dispute",
        "volunteer_mark_notification_read",
        "volunteer_mark_all_notifications_read",
        "volunteer_follow_org",
        "volunteer_unfollow_org",
        "volunteer_update_profile",
        "volunteer_update_privacy",
        "volunteer_add_skill",
        "volunteer_remove_skill",
        "volunteer_sign_waiver",
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
        "coordinator_approve_application",
        "coordinator_reject_application",
        "coordinator_waitlist_application",
        "coordinator_promote_application",
        "coordinator_mark_application_noshow",
        "coordinator_publish_opportunity",
        "coordinator_cancel_opportunity",
        "coordinator_add_shift",
        "coordinator_update_shift",
        "coordinator_remove_shift",
        "coordinator_update_opportunity_info",
        "coordinator_set_required_skills",
        "coordinator_post_announcement",
        "coordinator_update_org_profile",
        "coordinator_create_event_task",
        "coordinator_toggle_event_task_complete",
        "coordinator_delete_event_task",
        "coordinator_create_event_template",
        "coordinator_delete_event_template",
        "coordinator_notify_volunteers",
        "coordinator_block_volunteer",
        "coordinator_unblock_volunteer",
        "coordinator_coordinator_checkin",
        "coordinator_confirm_attendance",
        "coordinator_adjust_attendance",
        "coordinator_mark_dispute_review",
        "coordinator_resolve_dispute",
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
        "admin_approve_org",
        "admin_reject_org",
        "admin_ban_user",
        "admin_unban_user",
        "admin_resolve_dispute",
        "admin_reset_user_password",
        "admin_change_user_role",
        "admin_reassign_coordinator",
        "admin_add_coordinator",
        "admin_remove_coordinator",
        "admin_create_skill",
        "admin_update_skill",
        "admin_delete_skill",
    };

    internal sealed record ToolDefinition(string Name, string Description, string[] Roles);
    internal sealed record ToolDescriptor(string Name, string Description);

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
        new("volunteer_apply_shift", "Volunteer applies to a shift. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_withdraw_application", "Volunteer withdraws own application. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_geo_checkin", "Volunteer geo check-in for attendance with lat/lon. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_checkout", "Volunteer checks out attendance. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_raise_dispute", "Volunteer raises attendance dispute. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_mark_notification_read", "Mark one notification as read. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_mark_all_notifications_read", "Mark all notifications as read. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_follow_org", "Volunteer follows an organization. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_unfollow_org", "Volunteer unfollows an organization. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_update_profile", "Update current volunteer profile fields. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_update_privacy", "Update volunteer privacy settings. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_add_skill", "Add one skill to current volunteer. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_remove_skill", "Remove one skill from current volunteer. Requires confirmed=true.", ["Volunteer"]),
        new("volunteer_sign_waiver", "Sign volunteer waiver. Requires confirmed=true.", ["Volunteer"]),
        new("coordinator_approve_application", "Approve one application. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_reject_application", "Reject one application with reason. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_waitlist_application", "Move one application to waitlist. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_promote_application", "Promote one waitlisted application. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_mark_application_noshow", "Mark one application as no-show. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_publish_opportunity", "Publish opportunity. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_cancel_opportunity", "Cancel opportunity with reason. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_add_shift", "Add shift to opportunity. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_update_shift", "Update one shift. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_remove_shift", "Remove one shift. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_update_opportunity_info", "Update opportunity core info. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_set_required_skills", "Set required skills for opportunity. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_post_announcement", "Post organization announcement. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_update_org_profile", "Update organization public profile. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_create_event_task", "Create event task for opportunity. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_toggle_event_task_complete", "Toggle task completion. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_delete_event_task", "Delete event task. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_create_event_template", "Create organization event template. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_delete_event_template", "Delete organization event template. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_notify_volunteers", "Send notification to volunteers in an opportunity. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_block_volunteer", "Block volunteer from organization. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_unblock_volunteer", "Unblock volunteer from organization. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_coordinator_checkin", "Coordinator check-in attendance for volunteer. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_confirm_attendance", "Coordinator confirms attendance with rating. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_adjust_attendance", "Coordinator adjusts check-in/out times. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_mark_dispute_review", "Coordinator marks dispute under review. Requires confirmed=true.", ["Coordinator"]),
        new("coordinator_resolve_dispute", "Coordinator resolves dispute. Requires confirmed=true.", ["Coordinator"]),
        new("admin_get_system_info", "Get Orleans system info summary.", ["SystemAdmin"]),
        new("admin_get_grain_distribution", "Get Orleans grain distribution by silo/type.", ["SystemAdmin"]),
        new("admin_get_users", "Get users list with basic filters.", ["SystemAdmin"]),
        new("admin_get_pending_orgs", "Get pending organizations.", ["SystemAdmin"]),
        new("admin_get_pending_disputes", "Get pending disputes.", ["SystemAdmin"]),
        new("admin_approve_org", "Approve organization. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_reject_org", "Reject organization with reason. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_ban_user", "Ban user account. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_unban_user", "Unban user account. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_resolve_dispute", "Resolve dispute from admin side. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_reset_user_password", "Reset user password. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_change_user_role", "Change user role to Volunteer/Coordinator. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_reassign_coordinator", "Reassign primary coordinator for organization. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_add_coordinator", "Add additional coordinator to organization. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_remove_coordinator", "Remove coordinator from organization. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_create_skill", "Create skill in global catalog. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_update_skill", "Update skill in global catalog. Requires confirmed=true.", ["SystemAdmin"]),
        new("admin_delete_skill", "Delete skill from global catalog. Requires confirmed=true.", ["SystemAdmin"]),
    ];

    private static readonly HashSet<string> WriteTools = new(StringComparer.OrdinalIgnoreCase)
    {
        "volunteer_apply_shift",
        "volunteer_withdraw_application",
        "volunteer_geo_checkin",
        "volunteer_checkout",
        "volunteer_raise_dispute",
        "volunteer_mark_notification_read",
        "volunteer_mark_all_notifications_read",
        "volunteer_follow_org",
        "volunteer_unfollow_org",
        "volunteer_update_profile",
        "volunteer_update_privacy",
        "volunteer_add_skill",
        "volunteer_remove_skill",
        "volunteer_sign_waiver",
        "coordinator_approve_application",
        "coordinator_reject_application",
        "coordinator_waitlist_application",
        "coordinator_promote_application",
        "coordinator_mark_application_noshow",
        "coordinator_publish_opportunity",
        "coordinator_cancel_opportunity",
        "coordinator_add_shift",
        "coordinator_update_shift",
        "coordinator_remove_shift",
        "coordinator_update_opportunity_info",
        "coordinator_set_required_skills",
        "coordinator_post_announcement",
        "coordinator_update_org_profile",
        "coordinator_create_event_task",
        "coordinator_toggle_event_task_complete",
        "coordinator_delete_event_task",
        "coordinator_create_event_template",
        "coordinator_delete_event_template",
        "coordinator_notify_volunteers",
        "coordinator_block_volunteer",
        "coordinator_unblock_volunteer",
        "coordinator_coordinator_checkin",
        "coordinator_confirm_attendance",
        "coordinator_adjust_attendance",
        "coordinator_mark_dispute_review",
        "coordinator_resolve_dispute",
        "admin_approve_org",
        "admin_reject_org",
        "admin_ban_user",
        "admin_unban_user",
        "admin_resolve_dispute",
        "admin_reset_user_password",
        "admin_change_user_role",
        "admin_reassign_coordinator",
        "admin_add_coordinator",
        "admin_remove_coordinator",
        "admin_create_skill",
        "admin_update_skill",
        "admin_delete_skill",
    };

    public static void MapAiToolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai").WithTags("AI").RequireAuthorization();

        group.MapGet("/tools", (HttpContext http) =>
        {
            var result = GetAllowedToolDefinitions(http)
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

    internal static IReadOnlyList<ToolDefinition> GetAllowedToolDefinitions(HttpContext http)
    {
        var tools = ResolveAllowedTools(http);
        return ToolCatalog
            .Where(t => tools.Contains(t.Name))
            .ToList();
    }

    internal static IReadOnlyList<ToolDescriptor> GetAllowedToolDescriptors(HttpContext http)
    {
        return GetAllowedToolDefinitions(http)
            .Select(t => new ToolDescriptor(t.Name, t.Description))
            .ToList();
    }

    internal static async Task<object?> ExecuteToolAsync(
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
        var normalizedTool = tool.Trim().ToLowerInvariant();
        EnsureWriteConfirmed(normalizedTool, arguments);

        switch (normalizedTool)
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
                var statusStr = GetOptionalString(arguments, "status");
                ApplicationStatus? status = ApplicationStatus.Pending; // Default to Pending for safety against AI hallucinations
                if (!string.IsNullOrEmpty(statusStr))
                {
                    if (string.Equals(statusStr, "All", StringComparison.OrdinalIgnoreCase)) status = null;
                    else if (Enum.TryParse<ApplicationStatus>(statusStr, true, out var parsed)) status = parsed;
                }
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await applicationQueryService.GetByVolunteerAsync(callerGrainId, status, skip, take);
            }

            case "get_my_attendance":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();
                var statusStr = GetOptionalString(arguments, "status");
                AttendanceStatus? status = null;
                if (!string.IsNullOrEmpty(statusStr))
                {
                    if (!string.Equals(statusStr, "All", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<AttendanceStatus>(statusStr, true, out var parsed)) status = parsed;
                }
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await attendanceQueryService.GetByVolunteerAsync(callerGrainId, status, skip, take);
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
                var statusStr = GetOptionalString(arguments, "status");
                OpportunityStatus? status = null; 
                if (!string.IsNullOrEmpty(statusStr))
                {
                    if (!string.Equals(statusStr, "All", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<OpportunityStatus>(statusStr, true, out var parsed)) status = parsed;
                }
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await opportunityQueryService.GetByOrganizationAsync(orgId, status, skip, take);
            }

            case "get_org_applications":
            {
                var orgId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, orgId);
                var statusStr = GetOptionalString(arguments, "status");
                ApplicationStatus? status = ApplicationStatus.Pending; // Default to Pending for safety
                if (!string.IsNullOrEmpty(statusStr))
                {
                    if (string.Equals(statusStr, "All", StringComparison.OrdinalIgnoreCase)) status = null;
                    else if (Enum.TryParse<ApplicationStatus>(statusStr, true, out var parsed)) status = parsed;
                }
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await applicationQueryService.GetByOrganizationAsync(orgId, status, skip, take);
            }

            case "get_opportunity_attendance":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();
                var statusStr = GetOptionalString(arguments, "status");
                AttendanceStatus? status = null;
                if (!string.IsNullOrEmpty(statusStr))
                {
                    if (!string.Equals(statusStr, "All", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<AttendanceStatus>(statusStr, true, out var parsed)) status = parsed;
                }
                var skip = Clamp(GetOptionalInt(arguments, "skip", 0), 0, 50_000);
                var take = Clamp(GetOptionalInt(arguments, "take", 100), 1, 500);
                return await attendanceQueryService.GetByOpportunityAsync(opportunityId, status, skip, take);
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

            case "volunteer_apply_shift":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var shiftId = GetRequiredGuid(arguments, "shiftId");
                var idempotencyKey = GetOptionalString(arguments, "idempotencyKey");
                if (string.IsNullOrWhiteSpace(idempotencyKey))
                    idempotencyKey = Guid.NewGuid().ToString("N");

                var appId = await grains.GetGrain<IOpportunityGrain>(opportunityId)
                    .SubmitApplication(callerGrainId, shiftId, idempotencyKey);

                return new { ok = true, applicationId = appId, opportunityId, shiftId };
            }

            case "volunteer_withdraw_application":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var appState = await appGrain.GetState();
                if (appState.VolunteerId != callerGrainId)
                    throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(appState.OpportunityId).WithdrawApplication(applicationId);
                return new { ok = true, withdrawn = true, applicationId };
            }

            case "volunteer_geo_checkin":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var lat = GetRequiredDouble(arguments, "lat");
                var lon = GetRequiredDouble(arguments, "lon");
                var proofPhotoUrl = GetOptionalString(arguments, "proofPhotoUrl") ?? "ai-geo-check-in";
                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                if (state.VolunteerId != callerGrainId)
                    throw new UnauthorizedAccessException();

                await attendanceGrain.CheckIn(lat, lon, proofPhotoUrl);
                return new { ok = true, attendanceId, action = "geo_checkin", lat, lon };
            }

            case "volunteer_checkout":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                if (state.VolunteerId != callerGrainId)
                    throw new UnauthorizedAccessException();

                await attendanceGrain.CheckOut();
                return new { ok = true, attendanceId, action = "checkout" };
            }

            case "volunteer_raise_dispute":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var reason = GetRequiredString(arguments, "reason");
                var evidenceUrl = GetOptionalString(arguments, "evidenceUrl") ?? string.Empty;

                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                if (state.VolunteerId != callerGrainId)
                    throw new UnauthorizedAccessException();

                await attendanceGrain.RaiseDispute(reason, evidenceUrl);
                return new { ok = true, attendanceId, action = "dispute_raised" };
            }

            case "volunteer_mark_notification_read":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var notificationId = GetRequiredGuid(arguments, "notificationId");
                var notification = await db.Notifications
                    .FirstOrDefaultAsync(n => n.Id == notificationId && n.VolunteerGrainId == callerGrainId);
                if (notification is null)
                    throw new ArgumentException("Notification not found.");

                notification.IsRead = true;
                await db.SaveChangesAsync();
                return new { ok = true, notificationId, markedRead = true };
            }

            case "volunteer_mark_all_notifications_read":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var count = await db.Notifications
                    .Where(n => n.VolunteerGrainId == callerGrainId && !n.IsRead)
                    .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

                return new { ok = true, markedCount = count };
            }

            case "volunteer_follow_org":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var organizationId = GetRequiredGuid(arguments, "organizationId");
                var exists = await db.OrganizationReadModels
                    .AsNoTracking()
                    .AnyAsync(o => o.OrgId == organizationId);
                if (!exists)
                    throw new ArgumentException("Organization not found.");

                var already = await db.VolunteerFollows
                    .AsNoTracking()
                    .AnyAsync(f => f.VolunteerGrainId == callerGrainId && f.OrgId == organizationId);
                if (!already)
                {
                    db.VolunteerFollows.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.VolunteerFollowEntity
                    {
                        VolunteerGrainId = callerGrainId,
                        OrgId = organizationId,
                    });
                    await db.SaveChangesAsync();
                }

                await grains.GetGrain<IVolunteerGrain>(callerGrainId).FollowOrg(organizationId);
                return new { ok = true, organizationId, followed = true };
            }

            case "volunteer_unfollow_org":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var organizationId = GetRequiredGuid(arguments, "organizationId");
                var row = await db.VolunteerFollows
                    .FirstOrDefaultAsync(f => f.VolunteerGrainId == callerGrainId && f.OrgId == organizationId);
                if (row is not null)
                {
                    db.VolunteerFollows.Remove(row);
                    await db.SaveChangesAsync();
                }

                await grains.GetGrain<IVolunteerGrain>(callerGrainId).UnfollowOrg(organizationId);
                return new { ok = true, organizationId, followed = false };
            }

            case "volunteer_update_profile":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var grain = grains.GetGrain<IVolunteerGrain>(callerGrainId);
                var current = await grain.GetProfile();

                var firstName = GetOptionalString(arguments, "firstName") ?? current.FirstName;
                var lastName = GetOptionalString(arguments, "lastName") ?? current.LastName;
                var email = GetOptionalString(arguments, "email") ?? current.Email;
                var phone = GetOptionalString(arguments, "phone") ?? current.Phone;
                var bio = GetOptionalString(arguments, "bio") ?? current.Bio;

                await grain.UpdateProfile(firstName, lastName, email, phone, bio);
                return new
                {
                    ok = true,
                    profile = new { firstName, lastName, email, phone, bio }
                };
            }

            case "volunteer_update_privacy":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var grain = grains.GetGrain<IVolunteerGrain>(callerGrainId);
                var current = await grain.GetProfile();

                var isProfilePublic = GetOptionalBool(arguments, "isProfilePublic") ?? current.IsProfilePublic;
                var allowEmail = GetOptionalBool(arguments, "allowEmail") ?? current.AllowEmailNotifications;
                var allowPush = GetOptionalBool(arguments, "allowPush") ?? current.AllowPushNotifications;

                await grain.UpdatePrivacySettings(isProfilePublic, allowEmail, allowPush);
                return new { ok = true, privacy = new { isProfilePublic, allowEmail, allowPush } };
            }

            case "volunteer_add_skill":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var skillId = GetRequiredGuid(arguments, "skillId");
                var exists = await db.Skills.AsNoTracking().AnyAsync(s => s.Id == skillId);
                if (!exists) throw new ArgumentException("Skill not found.");

                var grain = grains.GetGrain<IVolunteerGrain>(callerGrainId);
                await grain.AddSkill(skillId);
                var skillIds = await grain.GetSkillIds();
                return new { ok = true, skillId, totalSkills = skillIds.Count };
            }

            case "volunteer_remove_skill":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var skillId = GetRequiredGuid(arguments, "skillId");
                var grain = grains.GetGrain<IVolunteerGrain>(callerGrainId);
                await grain.RemoveSkill(skillId);
                var skillIds = await grain.GetSkillIds();
                return new { ok = true, skillId, totalSkills = skillIds.Count };
            }

            case "volunteer_sign_waiver":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var grain = grains.GetGrain<IVolunteerGrain>(callerGrainId);
                await grain.SignWaiver();
                var profile = await grain.GetProfile();
                return new { ok = true, signedAt = profile.WaiverSignedAt };
            }

            case "coordinator_approve_application":
            {
                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var state = await appGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();
                if (http.IsSelfByGrainId(state.VolunteerId))
                    throw new InvalidOperationException("You cannot approve your own application.");

                await appGrain.Approve();
                return new { ok = true, applicationId, action = "approved" };
            }

            case "coordinator_reject_application":
            {
                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var reason = GetRequiredString(arguments, "reason");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var state = await appGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await appGrain.Reject(reason);
                return new { ok = true, applicationId, action = "rejected" };
            }

            case "coordinator_waitlist_application":
            {
                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var state = await appGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await appGrain.Waitlist();
                return new { ok = true, applicationId, action = "waitlisted" };
            }

            case "coordinator_promote_application":
            {
                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var state = await appGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await appGrain.Promote();
                return new { ok = true, applicationId, action = "promoted" };
            }

            case "coordinator_mark_application_noshow":
            {
                var applicationId = GetRequiredGuid(arguments, "applicationId");
                var appGrain = grains.GetGrain<IApplicationGrain>(applicationId);
                var state = await appGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await appGrain.MarkAsNoShow();
                return new { ok = true, applicationId, action = "no_show" };
            }

            case "coordinator_publish_opportunity":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).Publish();
                return new { ok = true, opportunityId, action = "published" };
            }

            case "coordinator_cancel_opportunity":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var reason = GetRequiredString(arguments, "reason");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).Cancel(reason);
                return new { ok = true, opportunityId, action = "canceled" };
            }

            case "coordinator_add_shift":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var name = GetRequiredString(arguments, "name");
                var startTime = GetRequiredDateTime(arguments, "startTime");
                var endTime = GetRequiredDateTime(arguments, "endTime");
                var maxCapacity = Clamp(GetOptionalInt(arguments, "maxCapacity", 1), 1, 10_000);

                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).AddShift(name, startTime, endTime, maxCapacity);
                return new { ok = true, opportunityId, shiftName = name };
            }

            case "coordinator_update_shift":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var shiftId = GetRequiredGuid(arguments, "shiftId");
                var name = GetRequiredString(arguments, "name");
                var startTime = GetRequiredDateTime(arguments, "startTime");
                var endTime = GetRequiredDateTime(arguments, "endTime");
                var maxCapacity = Clamp(GetOptionalInt(arguments, "maxCapacity", 1), 1, 10_000);

                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).UpdateShift(shiftId, name, startTime, endTime, maxCapacity);
                return new { ok = true, opportunityId, shiftId, action = "updated" };
            }

            case "coordinator_remove_shift":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var shiftId = GetRequiredGuid(arguments, "shiftId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).RemoveShift(shiftId);
                return new { ok = true, opportunityId, shiftId, action = "removed" };
            }

            case "coordinator_update_opportunity_info":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var title = GetRequiredString(arguments, "title");
                var description = GetRequiredString(arguments, "description");
                var category = GetRequiredString(arguments, "category");
                var lat = GetRequiredDouble(arguments, "lat");
                var lon = GetRequiredDouble(arguments, "lon");
                var radiusMeters = GetRequiredDouble(arguments, "radiusMeters");

                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId)
                    .UpdateInfo(title, description, category, lat, lon, radiusMeters);
                return new { ok = true, opportunityId, action = "updated" };
            }

            case "coordinator_set_required_skills":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var skillIds = GetGuidList(arguments, "skillIds");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await grains.GetGrain<IOpportunityGrain>(opportunityId).SetRequiredSkills(skillIds);
                return new { ok = true, opportunityId, requiredSkillCount = skillIds.Count };
            }

            case "coordinator_post_announcement":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);
                var text = GetRequiredString(arguments, "text").Trim();
                if (string.IsNullOrWhiteSpace(text))
                    throw new ArgumentException("Announcement text is required.");

                await grains.GetGrain<IOrganizationGrain>(organizationId).PostAnnouncement(text);
                return new { ok = true, organizationId, action = "announcement_posted" };
            }

            case "coordinator_update_org_profile":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);

                var websiteUrl = GetOptionalString(arguments, "websiteUrl");
                var contactEmail = GetOptionalString(arguments, "contactEmail");
                var tags = GetStringList(arguments, "tags");

                await grains.GetGrain<IOrganizationGrain>(organizationId).UpdateProfile(websiteUrl, contactEmail, tags);
                return new { ok = true, organizationId, action = "profile_updated" };
            }

            case "coordinator_create_event_task":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var title = GetRequiredString(arguments, "title");
                var note = GetOptionalString(arguments, "note");
                var assignedToGrainId = GetOptionalGuid(arguments, "assignedToGrainId");
                var assignedToEmail = GetOptionalString(arguments, "assignedToEmail");
                var assignedToName = GetOptionalString(arguments, "assignedToName");

                string? createdByEmail = null;
                if (http.TryGetUserId(out var callerUserId))
                {
                    createdByEmail = await db.Users
                        .AsNoTracking()
                        .Where(u => u.Id == callerUserId)
                        .Select(u => u.Email)
                        .FirstOrDefaultAsync();
                }

                var opp = await grains.GetGrain<IOpportunityGrain>(opportunityId).GetState();
                var task = new VSMS.Infrastructure.Data.EfCoreQuery.Entities.EventTaskEntity
                {
                    Id = Guid.NewGuid(),
                    OpportunityId = opportunityId,
                    OrganizationId = opp.OrganizationId,
                    Title = title,
                    Note = note,
                    AssignedToGrainId = assignedToGrainId,
                    AssignedToEmail = assignedToEmail,
                    AssignedToName = assignedToName,
                    CreatedByGrainId = callerGrainId,
                    CreatedByEmail = createdByEmail,
                    CreatedAt = DateTime.UtcNow,
                };
                db.EventTasks.Add(task);
                await db.SaveChangesAsync();

                return new { ok = true, opportunityId, taskId = task.Id, action = "created" };
            }

            case "coordinator_toggle_event_task_complete":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var taskId = GetRequiredGuid(arguments, "taskId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                var task = await db.EventTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OpportunityId == opportunityId);
                if (task is null) throw new ArgumentException("Task not found.");
                task.IsCompleted = !task.IsCompleted;
                task.CompletedAt = task.IsCompleted ? DateTime.UtcNow : null;
                await db.SaveChangesAsync();

                return new { ok = true, opportunityId, taskId, isCompleted = task.IsCompleted };
            }

            case "coordinator_delete_event_task":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var taskId = GetRequiredGuid(arguments, "taskId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                var task = await db.EventTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.OpportunityId == opportunityId);
                if (task is null) throw new ArgumentException("Task not found.");
                db.EventTasks.Remove(task);
                await db.SaveChangesAsync();
                return new { ok = true, opportunityId, taskId, action = "deleted" };
            }

            case "coordinator_create_event_template":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);

                var name = GetRequiredString(arguments, "name").Trim();
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Template name is required.");

                var title = GetOptionalString(arguments, "title")?.Trim() ?? string.Empty;
                var description = GetOptionalString(arguments, "description")?.Trim() ?? string.Empty;
                var category = GetOptionalString(arguments, "category")?.Trim() ?? string.Empty;
                var tags = GetStringList(arguments, "tags").ToArray();
                var approvalPolicy = GetOptionalString(arguments, "approvalPolicy") ?? "ManualApprove";
                var requiredSkillIds = GetStringList(arguments, "requiredSkillIds").ToArray();
                var latitude = GetOptionalDouble(arguments, "latitude");
                var longitude = GetOptionalDouble(arguments, "longitude");
                var radiusMeters = GetOptionalInt(arguments, "radiusMeters", 0);
                int? safeRadius = radiusMeters > 0 ? radiusMeters : null;

                var entity = new VSMS.Infrastructure.Data.EfCoreQuery.Entities.EventTemplateEntity
                {
                    OrganizationId = organizationId,
                    Name = name,
                    Title = title,
                    Description = description,
                    Category = category,
                    TagsJson = JsonSerializer.Serialize(tags),
                    ApprovalPolicy = approvalPolicy,
                    RequiredSkillIdsJson = JsonSerializer.Serialize(requiredSkillIds),
                    Latitude = latitude,
                    Longitude = longitude,
                    RadiusMeters = safeRadius,
                };

                db.EventTemplates.Add(entity);
                await db.SaveChangesAsync();
                return new { ok = true, organizationId, templateId = entity.Id, action = "created" };
            }

            case "coordinator_delete_event_template":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);
                var templateId = GetRequiredGuid(arguments, "templateId");

                var entity = await db.EventTemplates
                    .FirstOrDefaultAsync(t => t.Id == templateId && t.OrganizationId == organizationId);
                if (entity is null) throw new ArgumentException("Template not found.");

                db.EventTemplates.Remove(entity);
                await db.SaveChangesAsync();
                return new { ok = true, organizationId, templateId, action = "deleted" };
            }

            case "coordinator_notify_volunteers":
            {
                var opportunityId = GetRequiredGuid(arguments, "opportunityId");
                var canManage = await http.CanManageOpportunityAsync(db, opportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                var message = GetRequiredString(arguments, "message");
                var targetStatus = GetOptionalString(arguments, "targetStatus") ?? "All";
                var targetIds = GetGuidList(arguments, "targetIds");

                var applications = await applicationQueryService.GetByOpportunityAsync(opportunityId);
                var recipients = targetIds.Count > 0
                    ? targetIds
                    : targetStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                        ? applications
                            .Where(a => a.Status == ApplicationStatus.Approved || a.Status == ApplicationStatus.Promoted)
                            .Select(a => a.VolunteerId)
                            .Distinct()
                            .ToList()
                        : applications
                            .Select(a => a.VolunteerId)
                            .Distinct()
                            .ToList();

                if (recipients.Count > 0)
                {
                    var senderName = await db.OpportunityReadModels
                        .AsNoTracking()
                        .Where(o => o.OpportunityId == opportunityId)
                        .Select(o => o.OrganizationName)
                        .FirstOrDefaultAsync() ?? "Coordinator";

                    var now = DateTime.UtcNow;
                    var notifications = recipients.Select(volunteerId => new VSMS.Infrastructure.Data.EfCoreQuery.Entities.NotificationEntity
                    {
                        Id = Guid.NewGuid(),
                        VolunteerGrainId = volunteerId,
                        Title = "Message from " + senderName,
                        Message = message,
                        SenderName = senderName,
                        SentAt = now,
                        IsRead = false,
                    });

                    db.Notifications.AddRange(notifications);
                    await db.SaveChangesAsync();
                    await grains.GetGrain<INotificationGrain>(Guid.Empty)
                        .SendBulkNotification(recipients, "Coordinator Message", message);
                }

                return new { ok = true, opportunityId, sent = recipients.Count };
            }

            case "coordinator_block_volunteer":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);
                var volunteerId = GetRequiredGuid(arguments, "volunteerId");
                await grains.GetGrain<IOrganizationGrain>(organizationId).BlockVolunteer(volunteerId);
                return new { ok = true, organizationId, volunteerId, blocked = true };
            }

            case "coordinator_unblock_volunteer":
            {
                var organizationId = await ResolveManagedOrganizationIdAsync(http, db, arguments);
                await EnsureCanManageOrganization(http, db, organizationId);
                var volunteerId = GetRequiredGuid(arguments, "volunteerId");
                await grains.GetGrain<IOrganizationGrain>(organizationId).UnblockVolunteer(volunteerId);
                return new { ok = true, organizationId, volunteerId, blocked = false };
            }

            case "coordinator_coordinator_checkin":
            {
                if (!http.TryGetGrainId(out _))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await attendanceGrain.CoordinatorCheckIn();
                return new { ok = true, attendanceId, action = "coordinator_checkin" };
            }

            case "coordinator_confirm_attendance":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var rating = Clamp(GetOptionalInt(arguments, "rating", 5), 1, 5);
                var supervisorId = GetOptionalGuid(arguments, "supervisorId") ?? callerGrainId;

                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await attendanceGrain.Confirm(supervisorId, rating);
                return new { ok = true, attendanceId, action = "confirmed", rating };
            }

            case "coordinator_adjust_attendance":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var newCheckIn = GetRequiredDateTime(arguments, "newCheckIn");
                var newCheckOut = GetRequiredDateTime(arguments, "newCheckOut");
                var reason = GetRequiredString(arguments, "reason");
                var coordinatorId = GetOptionalGuid(arguments, "coordinatorId") ?? callerGrainId;

                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await attendanceGrain.ManualAdjustment(coordinatorId, newCheckIn, newCheckOut, reason);
                return new { ok = true, attendanceId, action = "adjusted" };
            }

            case "coordinator_mark_dispute_review":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var coordinatorId = GetOptionalGuid(arguments, "coordinatorId") ?? callerGrainId;

                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await attendanceGrain.MarkDisputeUnderReview(coordinatorId);
                return new { ok = true, attendanceId, action = "under_review" };
            }

            case "coordinator_resolve_dispute":
            {
                if (!http.TryGetGrainId(out var callerGrainId))
                    throw new UnauthorizedAccessException();

                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var resolution = GetRequiredString(arguments, "resolution");
                var adjustedHours = GetRequiredDouble(arguments, "adjustedHours");
                var resolverId = GetOptionalGuid(arguments, "resolverId") ?? callerGrainId;

                var attendanceGrain = grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
                var state = await attendanceGrain.GetState();
                var canManage = await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
                if (!canManage) throw new UnauthorizedAccessException();

                await attendanceGrain.ResolveDispute(resolverId, resolution, adjustedHours);
                return new { ok = true, attendanceId, action = "resolved", adjustedHours };
            }

            case "admin_approve_org":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var orgId = GetRequiredGuid(arguments, "orgId");
                await grains.GetGrain<IAdminGrain>(Guid.Empty).ApproveOrganization(orgId);
                return new { ok = true, orgId, action = "approved" };
            }

            case "admin_reject_org":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var orgId = GetRequiredGuid(arguments, "orgId");
                var reason = GetRequiredString(arguments, "reason");
                await grains.GetGrain<IAdminGrain>(Guid.Empty).RejectOrganization(orgId, reason);

                var coords = await db.Coordinators.Where(c => c.OrganizationId == orgId).ToListAsync();
                foreach (var c in coords) c.OrganizationId = null;
                await db.SaveChangesAsync();

                return new { ok = true, orgId, action = "rejected" };
            }

            case "admin_ban_user":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var userId = GetRequiredGuid(arguments, "userId");
                if (http.TryGetUserId(out var callerUserId) && callerUserId == userId)
                    throw new InvalidOperationException("You cannot ban yourself.");

                await grains.GetGrain<IAdminGrain>(Guid.Empty).BanUser(userId);
                return new { ok = true, userId, banned = true };
            }

            case "admin_unban_user":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var userId = GetRequiredGuid(arguments, "userId");
                await grains.GetGrain<IAdminGrain>(Guid.Empty).UnbanUser(userId);
                return new { ok = true, userId, banned = false };
            }

            case "admin_resolve_dispute":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var attendanceId = GetRequiredGuid(arguments, "attendanceId");
                var resolution = GetRequiredString(arguments, "resolution");
                var adjustedHours = GetRequiredDouble(arguments, "adjustedHours");
                await grains.GetGrain<IAdminGrain>(Guid.Empty).ResolveDispute(attendanceId, resolution, adjustedHours);
                return new { ok = true, attendanceId, action = "resolved", adjustedHours };
            }

            case "admin_reset_user_password":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var userId = GetRequiredGuid(arguments, "userId");
                var newPassword = GetRequiredString(arguments, "newPassword");
                if (newPassword.Length < 6)
                    throw new ArgumentException("Password must be at least 6 characters.");

                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user is null) throw new ArgumentException("User not found.");
                if (user.Role == "SystemAdmin")
                    throw new InvalidOperationException("Cannot reset SystemAdmin password via this tool.");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
                await db.SaveChangesAsync();
                return new { ok = true, userId, action = "password_reset" };
            }

            case "admin_change_user_role":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var userId = GetRequiredGuid(arguments, "userId");
                var newRole = (GetRequiredString(arguments, "newRole")).Trim();
                if (!newRole.Equals("Volunteer", StringComparison.OrdinalIgnoreCase) &&
                    !newRole.Equals("Coordinator", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("newRole must be Volunteer or Coordinator.");

                var normalizedRole = char.ToUpperInvariant(newRole[0]) + newRole[1..].ToLowerInvariant();
                var user = await db.Users
                    .Include(u => u.VolunteerProfile)
                    .Include(u => u.CoordinatorProfile)
                    .FirstOrDefaultAsync(u => u.Id == userId);
                if (user is null) throw new ArgumentException("User not found.");
                if (user.Role == "SystemAdmin")
                    throw new InvalidOperationException("Cannot change SystemAdmin role.");
                if (user.Role == normalizedRole)
                    return new { ok = true, userId, role = normalizedRole, changed = false };

                user.Role = normalizedRole;
                if (normalizedRole == "Coordinator" && user.CoordinatorProfile is null)
                {
                    db.Coordinators.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.CoordinatorEntity
                    {
                        UserId = userId,
                        GrainId = Guid.NewGuid()
                    });
                }
                else if (normalizedRole == "Volunteer" && user.VolunteerProfile is null)
                {
                    db.Volunteers.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.VolunteerEntity
                    {
                        UserId = userId,
                        GrainId = Guid.NewGuid()
                    });
                }

                await db.SaveChangesAsync();
                return new { ok = true, userId, role = normalizedRole, changed = true };
            }

            case "admin_reassign_coordinator":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var orgId = GetRequiredGuid(arguments, "orgId");
                var coordinatorUserId = GetRequiredGuid(arguments, "coordinatorUserId");
                var newCoord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == coordinatorUserId);
                if (newCoord is null)
                    throw new ArgumentException("Coordinator profile not found.");

                var oldCoords = await db.Coordinators.Where(c => c.OrganizationId == orgId).ToListAsync();
                foreach (var old in oldCoords) old.OrganizationId = null;
                newCoord.OrganizationId = orgId;
                await db.SaveChangesAsync();
                return new { ok = true, orgId, coordinatorUserId, action = "reassigned" };
            }

            case "admin_add_coordinator":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var orgId = GetRequiredGuid(arguments, "orgId");
                var coordinatorUserId = GetRequiredGuid(arguments, "coordinatorUserId");
                var coord = await db.Coordinators
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.UserId == coordinatorUserId);
                if (coord is null)
                    throw new ArgumentException("Coordinator profile not found.");

                coord.OrganizationId = orgId;
                await db.SaveChangesAsync();
                await grains.GetGrain<IOrganizationGrain>(orgId).AddCoordinator(coordinatorUserId, coord.User.Email);
                return new { ok = true, orgId, coordinatorUserId, action = "added" };
            }

            case "admin_remove_coordinator":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var orgId = GetRequiredGuid(arguments, "orgId");
                var coordinatorUserId = GetRequiredGuid(arguments, "coordinatorUserId");
                var coord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == coordinatorUserId);
                if (coord is null)
                    throw new ArgumentException("Coordinator profile not found.");

                coord.OrganizationId = null;
                await db.SaveChangesAsync();
                await grains.GetGrain<IOrganizationGrain>(orgId).RemoveCoordinator(coordinatorUserId);
                return new { ok = true, orgId, coordinatorUserId, action = "removed" };
            }

            case "admin_create_skill":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var name = GetRequiredString(arguments, "name");
                var category = GetRequiredString(arguments, "category");
                var description = GetOptionalString(arguments, "description") ?? string.Empty;

                var exists = await db.Skills.AsNoTracking().AnyAsync(s => s.Name == name);
                if (exists) throw new InvalidOperationException("Skill already exists.");

                var skill = new VSMS.Infrastructure.Data.EfCoreQuery.Entities.SkillEntity
                {
                    Name = name,
                    Category = category,
                    Description = description,
                };
                db.Skills.Add(skill);
                await db.SaveChangesAsync();
                return new { ok = true, skillId = skill.Id, name, category };
            }

            case "admin_update_skill":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var skillId = GetRequiredGuid(arguments, "skillId");
                var skill = await db.Skills.FirstOrDefaultAsync(s => s.Id == skillId);
                if (skill is null) throw new ArgumentException("Skill not found.");

                var name = GetOptionalString(arguments, "name") ?? skill.Name;
                var category = GetOptionalString(arguments, "category") ?? skill.Category;
                var description = GetOptionalString(arguments, "description") ?? skill.Description;

                var duplicate = await db.Skills.AsNoTracking().AnyAsync(s => s.Name == name && s.Id != skillId);
                if (duplicate) throw new InvalidOperationException("A skill with this name already exists.");

                skill.Name = name;
                skill.Category = category;
                skill.Description = description;
                await db.SaveChangesAsync();
                return new { ok = true, skillId, name, category };
            }

            case "admin_delete_skill":
            {
                if (!http.IsSystemAdmin()) throw new UnauthorizedAccessException();
                var skillId = GetRequiredGuid(arguments, "skillId");
                var skill = await db.Skills.FirstOrDefaultAsync(s => s.Id == skillId);
                if (skill is null) throw new ArgumentException("Skill not found.");
                db.Skills.Remove(skill);
                await db.SaveChangesAsync();
                return new { ok = true, skillId, action = "deleted" };
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

    internal static HashSet<string> ResolveAllowedTools(HttpContext http)
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
        if (args.ValueKind != JsonValueKind.Object) return null;
        foreach (var prop in args.EnumerateObject())
        {
            if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                if (prop.Value.ValueKind == JsonValueKind.String) return prop.Value.GetString();
                if (prop.Value.ValueKind == JsonValueKind.Number) return prop.Value.GetRawText();
                if (prop.Value.ValueKind == JsonValueKind.True) return "true";
                if (prop.Value.ValueKind == JsonValueKind.False) return "false";
                return prop.Value.ToString();
            }
        }
        return null;
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

    private static bool? GetOptionalBool(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object) return null;
        if (!args.TryGetProperty(name, out var node)) return null;
        if (node.ValueKind == JsonValueKind.True) return true;
        if (node.ValueKind == JsonValueKind.False) return false;
        if (node.ValueKind == JsonValueKind.String && bool.TryParse(node.GetString(), out var parsed)) return parsed;
        return null;
    }

    private static DateTime GetRequiredDateTime(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object || !args.TryGetProperty(name, out var node))
            throw new ArgumentException($"{name} is required.");

        if (node.ValueKind == JsonValueKind.String &&
            DateTime.TryParse(node.GetString(), out var parsed))
            return parsed;

        throw new ArgumentException($"{name} must be a valid datetime.");
    }

    private static double GetRequiredDouble(JsonElement args, string name)
    {
        var value = GetOptionalDouble(args, name);
        if (!value.HasValue)
            throw new ArgumentException($"{name} is required.");
        return value.Value;
    }

    private static List<Guid> GetGuidList(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object || !args.TryGetProperty(name, out var node))
            return [];

        var list = new List<Guid>();
        if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String && Guid.TryParse(item.GetString(), out var id))
                    list.Add(id);
            }
        }
        else if (node.ValueKind == JsonValueKind.String)
        {
            var raw = node.GetString();
            if (!string.IsNullOrWhiteSpace(raw))
            {
                var parts = raw.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    if (Guid.TryParse(part, out var id))
                        list.Add(id);
                }
            }
        }

        return list.Distinct().ToList();
    }

    private static List<string> GetStringList(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object || !args.TryGetProperty(name, out var node))
            return [];

        var list = new List<string>();
        if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(item.GetString()))
                    list.Add(item.GetString()!.Trim());
                else if (item.ValueKind != JsonValueKind.Null && item.ValueKind != JsonValueKind.Undefined)
                    list.Add(item.ToString().Trim());
            }
        }
        else if (node.ValueKind == JsonValueKind.String)
        {
            var raw = node.GetString();
            if (!string.IsNullOrWhiteSpace(raw))
            {
                list.AddRange(raw
                    .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    .Where(x => !string.IsNullOrWhiteSpace(x)));
            }
        }

        return list.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
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

    private static void EnsureWriteConfirmed(string tool, JsonElement args)
    {
        if (!WriteTools.Contains(tool))
            return;

        var confirmed = GetOptionalBool(args, "confirmed");
        if (confirmed == true)
            return;

        throw new InvalidOperationException(
            $"Write action '{tool}' requires explicit confirmation. Ask for confirmation first, then call again with confirmed=true.");
    }

    // ─── Unified Tool Input Schema (shared by AiChat + MCP) ─────────────────────
    public static object BuildToolInputSchema(string toolName)
    {
        return toolName switch
        {
            // ── Shared read tools ──────────────────────────────────────
            "search_opportunities" => Obj(new
            {
                query = Str("Search keyword for title or organization name."),
                category = Str("Category filter, e.g. Community, Environment, Education, Health, Technology."),
                skip = Int("Paging offset (default 0)."),
                take = Int("Page size (default 100, max 500).")
            }),
            "recommend_opportunities" => Obj(new
            {
                query = Str("Optional search keyword."),
                category = Str("Optional category filter."),
                lat = Num("Client latitude for distance ranking."),
                lon = Num("Client longitude for distance ranking."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }),
            "get_opportunity_detail" => Obj(new
            {
                opportunityId = Str("Opportunity Guid.")
            }, "opportunityId"),
            "get_my_applications" => Obj(new
            {
                status = Str("Status filter (e.g. 'Pending', 'Approved'). REQUIRED. Use 'All' for no filter."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }, "status"),
            "get_my_attendance" => Obj(new
            {
                status = Str("Status filter. REQUIRED. Use 'All' for no filter."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }, "status"),
            "get_my_profile" => EmptyObj(),
            "get_my_skills" => EmptyObj(),
            "get_notifications" => Obj(new
            {
                limit = Int("Max notifications to return (default 50, max 100).")
            }),
            "get_unread_notification_count" => EmptyObj(),
            "get_org_announcements" => Obj(new
            {
                organizationId = Str("Organization Guid.")
            }, "organizationId"),
            "get_org_state" => Obj(new
            {
                organizationId = Str("Organization Guid (auto-resolved for coordinator).")
            }),
            "get_org_opportunities" => Obj(new
            {
                organizationId = Str("Organization Guid (auto-resolved for coordinator)."),
                status = Str("Status filter ('Draft', 'Published', etc). REQUIRED. Use 'All' for no filter."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }, "status"),
            "get_org_applications" => Obj(new
            {
                organizationId = Str("Organization Guid (auto-resolved for coordinator)."),
                status = Str("Status filter ('Pending', 'Approved', etc). REQUIRED. Use 'All' for no filter."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }, "status"),
            "get_opportunity_attendance" => Obj(new
            {
                opportunityId = Str("Opportunity Guid."),
                status = Str("Status filter. REQUIRED. Use 'All' for no filter."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }, "opportunityId", "status"),
            "get_org_volunteers" => Obj(new
            {
                organizationId = Str("Organization Guid (auto-resolved for coordinator).")
            }),
            "get_org_event_templates" => Obj(new
            {
                organizationId = Str("Organization Guid (auto-resolved for coordinator).")
            }),
            "get_event_tasks" => Obj(new
            {
                opportunityId = Str("Opportunity Guid.")
            }, "opportunityId"),
            "get_skill_catalog" => EmptyObj(),
            "get_certificate_templates" => Obj(new
            {
                organizationId = Str("Optional organization Guid to include org-specific templates.")
            }),
            "verify_certificate_public" => Obj(new
            {
                certificateId = Str("Public certificate id string.")
            }, "certificateId"),

            // ── Volunteer write tools ──────────────────────────────────
            "volunteer_apply_shift" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                shiftId = Str("Shift Guid to apply for."),
                idempotencyKey = Str("Optional idempotency key."),
                confirmed = Bool()
            }, "opportunityId", "shiftId", "confirmed"),
            "volunteer_withdraw_application" => WriteObj(new
            {
                applicationId = Str("Application Guid to withdraw."),
                confirmed = Bool()
            }, "applicationId", "confirmed"),
            "volunteer_geo_checkin" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                lat = Num("Latitude for geo check-in."),
                lon = Num("Longitude for geo check-in."),
                proofPhotoUrl = Str("Optional proof photo URL."),
                confirmed = Bool()
            }, "attendanceId", "lat", "lon", "confirmed"),
            "volunteer_checkout" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                confirmed = Bool()
            }, "attendanceId", "confirmed"),
            "volunteer_raise_dispute" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                reason = Str("Dispute reason text."),
                evidenceUrl = Str("Optional evidence URL."),
                confirmed = Bool()
            }, "attendanceId", "reason", "confirmed"),
            "volunteer_mark_notification_read" => WriteObj(new
            {
                notificationId = Str("Notification Guid."),
                confirmed = Bool()
            }, "notificationId", "confirmed"),
            "volunteer_mark_all_notifications_read" => WriteObj(new
            {
                confirmed = Bool()
            }, "confirmed"),
            "volunteer_follow_org" => WriteObj(new
            {
                organizationId = Str("Organization Guid to follow."),
                confirmed = Bool()
            }, "organizationId", "confirmed"),
            "volunteer_unfollow_org" => WriteObj(new
            {
                organizationId = Str("Organization Guid to unfollow."),
                confirmed = Bool()
            }, "organizationId", "confirmed"),
            "volunteer_update_profile" => WriteObj(new
            {
                firstName = Str("Updated first name."),
                lastName = Str("Updated last name."),
                email = Str("Updated email."),
                phone = Str("Updated phone."),
                bio = Str("Updated bio."),
                confirmed = Bool()
            }, "confirmed"),
            "volunteer_update_privacy" => WriteObj(new
            {
                isProfilePublic = new { type = "boolean", description = "Whether profile is public." },
                allowEmail = new { type = "boolean", description = "Allow email notifications." },
                allowPush = new { type = "boolean", description = "Allow push notifications." },
                confirmed = Bool()
            }, "confirmed"),
            "volunteer_add_skill" => WriteObj(new
            {
                skillId = Str("Skill Guid from skill catalog."),
                confirmed = Bool()
            }, "skillId", "confirmed"),
            "volunteer_remove_skill" => WriteObj(new
            {
                skillId = Str("Skill Guid to remove."),
                confirmed = Bool()
            }, "skillId", "confirmed"),
            "volunteer_sign_waiver" => WriteObj(new
            {
                confirmed = Bool()
            }, "confirmed"),

            // ── Coordinator write tools ────────────────────────────────
            "coordinator_approve_application" => WriteObj(new
            {
                applicationId = Str("Application Guid to approve."),
                confirmed = Bool()
            }, "applicationId", "confirmed"),
            "coordinator_reject_application" => WriteObj(new
            {
                applicationId = Str("Application Guid to reject."),
                reason = Str("Rejection reason."),
                confirmed = Bool()
            }, "applicationId", "reason", "confirmed"),
            "coordinator_waitlist_application" => WriteObj(new
            {
                applicationId = Str("Application Guid."),
                confirmed = Bool()
            }, "applicationId", "confirmed"),
            "coordinator_promote_application" => WriteObj(new
            {
                applicationId = Str("Application Guid to promote from waitlist."),
                confirmed = Bool()
            }, "applicationId", "confirmed"),
            "coordinator_mark_application_noshow" => WriteObj(new
            {
                applicationId = Str("Application Guid."),
                confirmed = Bool()
            }, "applicationId", "confirmed"),
            "coordinator_publish_opportunity" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid to publish."),
                confirmed = Bool()
            }, "opportunityId", "confirmed"),
            "coordinator_cancel_opportunity" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid to cancel."),
                reason = Str("Cancellation reason."),
                confirmed = Bool()
            }, "opportunityId", "reason", "confirmed"),
            "coordinator_add_shift" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                name = Str("Shift name."),
                startTime = Str("Shift start datetime ISO 8601."),
                endTime = Str("Shift end datetime ISO 8601."),
                maxCapacity = Int("Max volunteer capacity."),
                confirmed = Bool()
            }, "opportunityId", "name", "startTime", "endTime", "confirmed"),
            "coordinator_update_shift" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                shiftId = Str("Shift Guid to update."),
                name = Str("Updated shift name."),
                startTime = Str("Updated start datetime."),
                endTime = Str("Updated end datetime."),
                maxCapacity = Int("Updated max capacity."),
                confirmed = Bool()
            }, "opportunityId", "shiftId", "name", "startTime", "endTime", "confirmed"),
            "coordinator_remove_shift" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                shiftId = Str("Shift Guid to remove."),
                confirmed = Bool()
            }, "opportunityId", "shiftId", "confirmed"),
            "coordinator_update_opportunity_info" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                title = Str("Updated title."),
                description = Str("Updated description."),
                category = Str("Updated category."),
                lat = Num("Updated latitude."),
                lon = Num("Updated longitude."),
                radiusMeters = Num("Updated geo-fence radius in meters."),
                confirmed = Bool()
            }, "opportunityId", "title", "description", "category", "lat", "lon", "radiusMeters", "confirmed"),
            "coordinator_set_required_skills" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                skillIds = new { type = "array", items = new { type = "string" }, description = "List of skill Guids." },
                confirmed = Bool()
            }, "opportunityId", "skillIds", "confirmed"),
            "coordinator_post_announcement" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                text = Str("Announcement text content."),
                confirmed = Bool()
            }, "text", "confirmed"),
            "coordinator_update_org_profile" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                websiteUrl = Str("Updated website URL."),
                contactEmail = Str("Updated contact email."),
                tags = new { type = "array", items = new { type = "string" }, description = "Updated tags." },
                confirmed = Bool()
            }, "confirmed"),
            "coordinator_create_event_task" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                title = Str("Task title."),
                note = Str("Optional task note."),
                assignedToGrainId = Str("Optional volunteer grain id to assign."),
                assignedToEmail = Str("Optional assignee email."),
                assignedToName = Str("Optional assignee name."),
                confirmed = Bool()
            }, "opportunityId", "title", "confirmed"),
            "coordinator_toggle_event_task_complete" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                taskId = Str("Task Guid."),
                confirmed = Bool()
            }, "opportunityId", "taskId", "confirmed"),
            "coordinator_delete_event_task" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                taskId = Str("Task Guid."),
                confirmed = Bool()
            }, "opportunityId", "taskId", "confirmed"),
            "coordinator_create_event_template" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                name = Str("Template name."),
                title = Str("Event title."),
                description = Str("Event description."),
                category = Str("Category."),
                tags = new { type = "array", items = new { type = "string" }, description = "Tags." },
                approvalPolicy = Str("AutoApprove | ManualApprove | InviteOnly."),
                requiredSkillIds = new { type = "array", items = new { type = "string" }, description = "Required skill Guids." },
                latitude = Num("Latitude."),
                longitude = Num("Longitude."),
                radiusMeters = Int("Geo-fence radius."),
                confirmed = Bool()
            }, "name", "confirmed"),
            "coordinator_delete_event_template" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                templateId = Str("Template Guid to delete."),
                confirmed = Bool()
            }, "templateId", "confirmed"),
            "coordinator_notify_volunteers" => WriteObj(new
            {
                opportunityId = Str("Opportunity Guid."),
                message = Str("Notification message text."),
                targetStatus = Str("Filter: All | Approved (default All)."),
                targetIds = new { type = "array", items = new { type = "string" }, description = "Optional specific volunteer grain ids." },
                confirmed = Bool()
            }, "opportunityId", "message", "confirmed"),
            "coordinator_block_volunteer" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                volunteerId = Str("Volunteer grain id to block."),
                confirmed = Bool()
            }, "volunteerId", "confirmed"),
            "coordinator_unblock_volunteer" => WriteObj(new
            {
                organizationId = Str("Organization Guid (auto-resolved)."),
                volunteerId = Str("Volunteer grain id to unblock."),
                confirmed = Bool()
            }, "volunteerId", "confirmed"),
            "coordinator_coordinator_checkin" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                confirmed = Bool()
            }, "attendanceId", "confirmed"),
            "coordinator_confirm_attendance" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                rating = Int("Supervisor rating 1-5 (default 5)."),
                supervisorId = Str("Optional supervisor grain id."),
                confirmed = Bool()
            }, "attendanceId", "confirmed"),
            "coordinator_adjust_attendance" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                newCheckIn = Str("Adjusted check-in datetime ISO 8601."),
                newCheckOut = Str("Adjusted check-out datetime ISO 8601."),
                reason = Str("Adjustment reason."),
                coordinatorId = Str("Optional coordinator grain id."),
                confirmed = Bool()
            }, "attendanceId", "newCheckIn", "newCheckOut", "reason", "confirmed"),
            "coordinator_mark_dispute_review" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                coordinatorId = Str("Optional coordinator grain id."),
                confirmed = Bool()
            }, "attendanceId", "confirmed"),
            "coordinator_resolve_dispute" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                resolution = Str("Resolution text."),
                adjustedHours = Num("Adjusted total hours."),
                resolverId = Str("Optional resolver grain id."),
                confirmed = Bool()
            }, "attendanceId", "resolution", "adjustedHours", "confirmed"),

            // ── Admin read tools ───────────────────────────────────────
            "admin_get_system_info" => EmptyObj(),
            "admin_get_grain_distribution" => EmptyObj(),
            "admin_get_users" => Obj(new
            {
                role = Str("Filter by role: Volunteer | Coordinator."),
                search = Str("Search by email."),
                status = Str("Filter: active | banned."),
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }),
            "admin_get_pending_orgs" => Obj(new
            {
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }),
            "admin_get_pending_disputes" => Obj(new
            {
                skip = Int("Paging offset."),
                take = Int("Page size.")
            }),

            // ── Admin write tools ──────────────────────────────────────
            "admin_approve_org" => WriteObj(new
            {
                orgId = Str("Organization Guid to approve."),
                confirmed = Bool()
            }, "orgId", "confirmed"),
            "admin_reject_org" => WriteObj(new
            {
                orgId = Str("Organization Guid to reject."),
                reason = Str("Rejection reason."),
                confirmed = Bool()
            }, "orgId", "reason", "confirmed"),
            "admin_ban_user" => WriteObj(new
            {
                userId = Str("User Guid to ban."),
                confirmed = Bool()
            }, "userId", "confirmed"),
            "admin_unban_user" => WriteObj(new
            {
                userId = Str("User Guid to unban."),
                confirmed = Bool()
            }, "userId", "confirmed"),
            "admin_resolve_dispute" => WriteObj(new
            {
                attendanceId = Str("Attendance record Guid."),
                resolution = Str("Resolution text."),
                adjustedHours = Num("Adjusted total hours."),
                confirmed = Bool()
            }, "attendanceId", "resolution", "adjustedHours", "confirmed"),
            "admin_reset_user_password" => WriteObj(new
            {
                userId = Str("User Guid."),
                newPassword = Str("New password (min 6 chars)."),
                confirmed = Bool()
            }, "userId", "newPassword", "confirmed"),
            "admin_change_user_role" => WriteObj(new
            {
                userId = Str("User Guid."),
                newRole = Str("Target role: Volunteer | Coordinator."),
                confirmed = Bool()
            }, "userId", "newRole", "confirmed"),
            "admin_reassign_coordinator" => WriteObj(new
            {
                orgId = Str("Organization Guid."),
                coordinatorUserId = Str("New coordinator user Guid."),
                confirmed = Bool()
            }, "orgId", "coordinatorUserId", "confirmed"),
            "admin_add_coordinator" => WriteObj(new
            {
                orgId = Str("Organization Guid."),
                coordinatorUserId = Str("Coordinator user Guid to add."),
                confirmed = Bool()
            }, "orgId", "coordinatorUserId", "confirmed"),
            "admin_remove_coordinator" => WriteObj(new
            {
                orgId = Str("Organization Guid."),
                coordinatorUserId = Str("Coordinator user Guid to remove."),
                confirmed = Bool()
            }, "orgId", "coordinatorUserId", "confirmed"),
            "admin_create_skill" => WriteObj(new
            {
                name = Str("Skill name."),
                category = Str("Skill category."),
                description = Str("Optional skill description."),
                confirmed = Bool()
            }, "name", "category", "confirmed"),
            "admin_update_skill" => WriteObj(new
            {
                skillId = Str("Skill Guid."),
                name = Str("Updated name."),
                category = Str("Updated category."),
                description = Str("Updated description."),
                confirmed = Bool()
            }, "skillId", "confirmed"),
            "admin_delete_skill" => WriteObj(new
            {
                skillId = Str("Skill Guid to delete."),
                confirmed = Bool()
            }, "skillId", "confirmed"),

            _ => EmptyObj()
        };
    }

    // ── Schema builder helpers ────────────────────────────────────────────────────
    private static object Str(string desc) => new { type = "string", description = desc };
    private static object Num(string desc) => new { type = "number", description = desc };
    private static object Int(string desc) => new { type = "integer", description = desc };
    private static object Bool() => new { type = "boolean", description = "Must be true for confirmed write actions." };

    private static object EmptyObj() => new
    {
        type = "object",
        properties = new { },
        additionalProperties = true
    };

    private static object Obj(object properties, params string[] required) => new
    {
        type = "object",
        properties,
        required = required.Length > 0 ? required : Array.Empty<string>(),
        additionalProperties = true
    };

    private static object WriteObj(object properties, params string[] required) => new
    {
        type = "object",
        properties,
        required = required.Length > 0 ? required : new[] { "confirmed" },
        additionalProperties = true
    };

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
