using System.Text.RegularExpressions;
using Orleans;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Abstractions.Services;
using VSMS.Api.Extensions;

namespace VSMS.Api.Features.Ai;

public static class AiChatEndpoints
{
    public static void MapAiChatEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai").WithTags("AI").RequireAuthorization();

        group.MapPost("/chat", async (
            AiChatRequest req,
            HttpContext http,
            IAiInferenceService inference,
            AppDbContext db,
            IGrainFactory grains,
            IOrganizationQueryService organizationQueryService,
            IOpportunityQueryService opportunityQueryService,
            IApplicationQueryService applicationQueryService,
            IAttendanceQueryService attendanceQueryService,
            CancellationToken ct) =>
        {
            if (req.Messages is null || req.Messages.Count == 0)
                return Results.BadRequest(new { error = "messages is required." });

            var cleaned = req.Messages
                .Where(m => !string.IsNullOrWhiteSpace(m.Content))
                .Select(m => new AiChatMessage(
                    NormalizeRole(m.Role),
                    m.Content.Trim()))
                .TakeLast(20)
                .ToList();

            if (cleaned.Count == 0)
                return Results.BadRequest(new { error = "At least one non-empty message is required." });

            var latestUserMessage = cleaned.LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
            var hasExplicitConfirmation = latestUserMessage is not null && IsExplicitConfirmation(latestUserMessage.Content);
            if (hasExplicitConfirmation && latestUserMessage is not null)
            {
                var idx = cleaned.LastIndexOf(latestUserMessage);
                cleaned[idx] = latestUserMessage with
                {
                    Content = $"{latestUserMessage.Content}\nSystem note: this is explicit confirmation. Execute the pending write action now with confirmed=true."
                };
            }

            var role = ResolveRole(http);
            var prompt = BuildRolePrompt(role, req.CurrentView, req.ClientLocation, hasExplicitConfirmation);
            var maxTokens = Clamp(req.MaxTokens ?? 900, 128, 4096);
            var temperature = Clamp(req.Temperature ?? 0.2, 0.0, 1.0);
            var allowedTools = AiToolEndpoints.GetAllowedToolDescriptors(http);
            var allowedSet = new HashSet<string>(allowedTools.Select(t => t.Name), StringComparer.OrdinalIgnoreCase);
            var aiTools = allowedTools
                .Select(t => new AiInferenceTool(t.Name, t.Description, BuildToolInputSchema(t.Name)))
                .ToList();

            try
            {
                var result = await inference.GenerateWithToolsAsync(
                    new AiInferenceRequest(prompt, cleaned, temperature, maxTokens),
                    aiTools,
                    async (toolName, args, cancellationToken) =>
                    {
                        if (!allowedSet.Contains(toolName))
                            throw new UnauthorizedAccessException($"Tool '{toolName}' is not allowed for current role.");

                        return await AiToolEndpoints.ExecuteToolAsync(
                            toolName,
                            args,
                            http,
                            db,
                            grains,
                            organizationQueryService,
                            opportunityQueryService,
                            applicationQueryService,
                            attendanceQueryService);
                    },
                    ct);

                var reply = PostProcessReply(result.Content);

                return Results.Ok(new AiChatResponse(
                    reply,
                    result.Provider,
                    result.Model,
                    role,
                    result.GeneratedAtUtc));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(
                    new { error = ex.Message },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        });
    }

    private static string ResolveRole(HttpContext http)
    {
        if (http.IsSystemAdmin()) return "SystemAdmin";
        if (http.IsCoordinator()) return "Coordinator";
        return "Volunteer";
    }

    private static string NormalizeRole(string role)
    {
        if (role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            return "assistant";
        if (role.Equals("system", StringComparison.OrdinalIgnoreCase))
            return "system";
        return "user";
    }

    private static string BuildRolePrompt(string role, string? currentView, AiClientLocation? clientLocation, bool hasExplicitConfirmation)
    {
        var basePrompt = role switch
        {
            "SystemAdmin" =>
                """
                You are the VSMS AI assistant for a SystemAdmin.
                Be precise, concise, and operationally safe.
                Use numbered steps for action guidance.
                Use available tools to fetch factual data before answering.
                Never fabricate system/runtime values.
                Always answer in the same language as the user's latest message.
                Do not show internal tool names in the final response.
                Use only the minimum required tools; avoid duplicate calls.
                Prefer a compact, human-readable summary instead of raw dumps or raw tables.
                For any write action, first ask for explicit confirmation.
                Only execute a write tool after user confirms, and pass confirmed=true.
                If the latest user message is an explicit confirmation (for example: "Yes, confirm", "确认", "请执行"), do not ask again and execute the pending write action immediately with confirmed=true.
                Output format:
                1) One-line conclusion
                2) Key data bullets (max 6)
                3) Optional next action (max 2)
                If any tool fails, state the failure briefly and continue with available facts.
                """,
            "Coordinator" =>
                """
                You are the VSMS AI assistant for a Coordinator.
                Focus on event management, applications, attendance, members, and certificates.
                Use available tools to fetch factual data before answering.
                Keep instructions practical and concise.
                Always answer in the same language as the user's latest message.
                Do not show internal tool names in the final response.
                Use only the minimum required tools; avoid duplicate calls.
                Prefer a compact, human-readable summary instead of raw dumps or raw tables.
                For any write action, first ask for explicit confirmation.
                Only execute a write tool after user confirms, and pass confirmed=true.
                If the latest user message is an explicit confirmation (for example: "Yes, confirm", "确认", "请执行"), do not ask again and execute the pending write action immediately with confirmed=true.
                Output format:
                1) One-line conclusion
                2) Key data bullets (max 6)
                3) Optional next action (max 2)
                If any tool fails, state the failure briefly and continue with available facts.
                """,
            _ =>
                """
                You are the VSMS AI assistant for a Volunteer.
                Focus on finding opportunities, applications, attendance, profile, skills, and certificates.
                Use available tools to fetch factual data before answering.
                Keep answers friendly, concrete, and concise.
                Always answer in the same language as the user's latest message.
                Do not show internal tool names in the final response.
                Use only the minimum required tools; avoid duplicate calls.
                Prefer a compact, human-readable summary instead of raw dumps or raw tables.
                For any write action, first ask for explicit confirmation.
                Only execute a write tool after user confirms, and pass confirmed=true.
                If the latest user message is an explicit confirmation (for example: "Yes, confirm", "确认", "请执行"), do not ask again and execute the pending write action immediately with confirmed=true.
                Output format:
                1) One-line conclusion
                2) Key data bullets (max 6)
                3) Optional next action (max 2)
                If any tool fails, state the failure briefly and continue with available facts.
                """
        };

        var parts = new List<string> { basePrompt };
        if (!string.IsNullOrWhiteSpace(currentView))
            parts.Add($"Current web page: {currentView.Trim()}");

        if (clientLocation is not null && IsValidLatLon(clientLocation.Lat, clientLocation.Lon))
        {
            parts.Add($"""
                Client location (browser geolocation):
                - latitude: {clientLocation.Lat:F6}
                - longitude: {clientLocation.Lon:F6}
                - accuracyMeters: {(clientLocation.AccuracyMeters.HasValue ? clientLocation.AccuracyMeters.Value.ToString("F1") : "unknown")}
                - capturedAtUtc: {(clientLocation.CapturedAtUtc?.ToString("O") ?? "unknown")}
                Use this location for distance-based tools unless user explicitly gives another location.
                """);
        }

        if (hasExplicitConfirmation)
        {
            parts.Add("Execution mode: user confirmation already provided. Execute the pending write action now with confirmed=true and do not ask confirmation again.");
        }

        return string.Join("\n", parts);
    }

    private static object BuildToolInputSchema(string toolName)
    {
        if (toolName.Equals("volunteer_geo_checkin", StringComparison.OrdinalIgnoreCase))
        {
            return new
            {
                type = "object",
                properties = new
                {
                    attendanceId = new { type = "string", description = "Attendance record Guid." },
                    lat = new { type = "number", description = "Latitude for geo check-in." },
                    lon = new { type = "number", description = "Longitude for geo check-in." },
                    proofPhotoUrl = new { type = "string", description = "Optional proof photo URL or marker." },
                    confirmed = new { type = "boolean", description = "Must be true for confirmed write actions." }
                },
                required = new[] { "attendanceId", "lat", "lon", "confirmed" },
                additionalProperties = true
            };
        }

        if (IsWriteTool(toolName))
        {
            return new
            {
                type = "object",
                properties = new
                {
                    confirmed = new { type = "boolean", description = "Must be true for confirmed write actions." }
                },
                required = new[] { "confirmed" },
                additionalProperties = true
            };
        }

        return toolName switch
        {
            "get_opportunity_detail" or "get_opportunity_attendance" or "get_event_tasks" => new
            {
                type = "object",
                properties = new
                {
                    opportunityId = new { type = "string", description = "Opportunity Guid." },
                    skip = new { type = "integer" },
                    take = new { type = "integer" }
                },
                required = new[] { "opportunityId" },
                additionalProperties = true
            },
            "verify_certificate_public" => new
            {
                type = "object",
                properties = new
                {
                    certificateId = new { type = "string", description = "Public certificate id." }
                },
                required = new[] { "certificateId" },
                additionalProperties = true
            },
            "get_org_announcements" => new
            {
                type = "object",
                properties = new
                {
                    organizationId = new { type = "string", description = "Organization Guid." }
                },
                required = new[] { "organizationId" },
                additionalProperties = true
            },
            _ => new
            {
                type = "object",
                additionalProperties = true
            }
        };
    }

    private static int Clamp(int value, int min, int max) => Math.Max(min, Math.Min(max, value));
    private static double Clamp(double value, double min, double max) => Math.Max(min, Math.Min(max, value));
    private static bool IsValidLatLon(double lat, double lon) => lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    private static bool IsExplicitConfirmation(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var t = text.Trim().ToLowerInvariant();
        return t.Contains("yes, confirm")
            || t.Equals("yes confirm")
            || t.Equals("confirm")
            || t.Equals("confirmed")
            || t.Contains("确认")
            || t.Contains("同意")
            || t.Contains("请执行");
    }

    private static bool IsWriteTool(string toolName)
    {
        if (toolName.StartsWith("volunteer_", StringComparison.OrdinalIgnoreCase))
            return true;
        if (toolName.StartsWith("coordinator_", StringComparison.OrdinalIgnoreCase))
            return true;
        if (toolName.StartsWith("admin_", StringComparison.OrdinalIgnoreCase) &&
            !toolName.StartsWith("admin_get_", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    private static string PostProcessReply(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return content;

        var text = content.Replace("\r\n", "\n").Trim();

        // Remove raw tool heading lines like: [admin_get_system_info] ...
        text = Regex.Replace(
            text,
            @"^\[[a-z0-9_]+\]\s.*(?:\n|$)",
            string.Empty,
            RegexOptions.Multiline | RegexOptions.IgnoreCase);

        // Remove duplicated paragraphs while preserving order.
        var paragraphs = Regex.Split(text, @"\n\s*\n")
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var deduped = new List<string>(paragraphs.Count);
        foreach (var paragraph in paragraphs)
        {
            if (seen.Add(paragraph))
                deduped.Add(paragraph);
        }

        var cleaned = string.Join("\n\n", deduped).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? content.Trim() : cleaned;
    }
}

public sealed record AiChatRequest(
    List<AiChatTurnRequest> Messages,
    string? CurrentView = null,
    AiClientLocation? ClientLocation = null,
    double? Temperature = null,
    int? MaxTokens = null);

public sealed record AiClientLocation(
    double Lat,
    double Lon,
    double? AccuracyMeters = null,
    DateTime? CapturedAtUtc = null,
    string? Source = null);

public sealed record AiChatTurnRequest(string Role, string Content);

public sealed record AiChatResponse(
    string Reply,
    string Provider,
    string Model,
    string Role,
    DateTime GeneratedAtUtc);
