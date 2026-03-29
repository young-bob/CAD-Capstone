using System.Text.Json;
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
            var maxTokens = Clamp(req.MaxTokens ?? 2048, 128, 4096);
            var temperature = Clamp(req.Temperature ?? 0.2, 0.0, 1.0);
            var allowedTools = AiToolEndpoints.GetAllowedToolDescriptors(http);
            var allowedSet = new HashSet<string>(allowedTools.Select(t => t.Name), StringComparer.OrdinalIgnoreCase);
            var aiTools = allowedTools
                .Select(t => new AiInferenceTool(t.Name, t.Description, AiToolEndpoints.BuildToolInputSchema(t.Name)))
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

                        var effectiveArgs = hasExplicitConfirmation
                            ? EnsureConfirmedForWriteTool(toolName, args)
                            : args;

                        return await AiToolEndpoints.ExecuteToolAsync(
                            toolName,
                            effectiveArgs,
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
        var sharedRules = """
            Always use available tools to fetch factual data before answering. Never fabricate data.
            Always answer in the same language as the user's latest message.
            Do not show internal tool names or raw JSON in the final response.
            Use only the minimum required tools; avoid duplicate calls.
            Prefer a compact, human-readable summary instead of raw dumps or large tables.
            For any write action, first ask for explicit confirmation.
            Only execute a write tool after user confirms, and pass confirmed=true.
            If the latest user message is an explicit confirmation (e.g. "Yes", "确认", "请执行"), execute the pending action immediately with confirmed=true without re-asking.
            For bulk requests (e.g. "approve all"), execute the write tool per target item after one confirmation.
            Output format: 1) One-line conclusion, 2) Key data bullets (max 6), 3) Optional next action (max 2).
            If any tool fails, state the failure briefly and continue with available facts.

            CRITICAL - ID preservation rules:
            - When listing items that the user may act upon (applications, attendance, notifications, etc.), ALWAYS include the item's ID (applicationId, attendanceId, etc.) in your response text.
            - Format: include the ID in parentheses after each item, e.g. "Amelia Zhang - Set-up Crew (ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6)".
            - When handling a bulk write action (e.g. "approve all"), re-call the read tool first to fetch current IDs, then execute write tools with those exact IDs. NEVER fabricate or reuse IDs from memory.
            - If you cannot find the required ID in conversation history, always re-fetch data from the appropriate read tool before attempting the write action.

            Tool usage rules:
            - For coordinator tools that require organizationId: you may omit it and the system auto-resolves to the coordinator's managed organization.
            - All Guid parameters must be valid UUID strings.
            - For geo check-in, use lat/lon from the client location context if available.
            - When the user asks to check in, first call get_my_attendance to find the eligible attendanceId, then call volunteer_geo_checkin.
            - When the user asks about notifications, call get_notifications first, then offer to mark as read.
            - For recommendation queries, use recommend_opportunities with the client location if available.
            """;

        var basePrompt = role switch
        {
            "SystemAdmin" =>
                $"""
                You are the VSMS AI assistant for a SystemAdmin.
                Be precise, concise, and operationally safe.
                Use numbered steps for action guidance.
                Never fabricate system/runtime values.
                {sharedRules}
                """,
            "Coordinator" =>
                $"""
                You are the VSMS AI assistant for a Coordinator.
                Focus on event management, applications, attendance, members, and certificates.
                Keep instructions practical and concise.
                {sharedRules}
                """,
            _ =>
                $"""
                You are the VSMS AI assistant for a Volunteer.
                Focus on finding opportunities, applications, attendance, profile, skills, and certificates.
                Keep answers friendly, concrete, and concise.
                {sharedRules}
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


    private static int Clamp(int value, int min, int max) => Math.Max(min, Math.Min(max, value));
    private static double Clamp(double value, double min, double max) => Math.Max(min, Math.Min(max, value));
    private static bool IsValidLatLon(double lat, double lon) => lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    private static bool IsExplicitConfirmation(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var t = Regex.Replace(text.Trim().ToLowerInvariant(), @"\s+", " ");

        if (t.Contains("确认") || t.Contains("同意") || t.Contains("请执行"))
            return true;

        if (t == "yes" || t == "y" || t == "confirm" || t == "confirmed")
            return true;

        if (t.Contains("yes, confirm") || t.Contains("yes confirm"))
            return true;

        if (Regex.IsMatch(t, @"^yes\b.*\b(confirm|approved?|approve|proceed|execute)\b"))
            return true;

        if (Regex.IsMatch(t, @"^(go ahead|please proceed|do it)\b"))
            return true;

        if (Regex.IsMatch(t, @"^yes\b.*\bapprove all\b"))
            return true;

        return false;
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

    private static JsonElement EnsureConfirmedForWriteTool(string toolName, JsonElement args)
    {
        if (!IsWriteTool(toolName))
            return args;

        if (args.ValueKind != JsonValueKind.Object)
            return ParseObjectElement("""{"confirmed":true}""");

        if (args.TryGetProperty("confirmed", out var confirmedNode) &&
            confirmedNode.ValueKind == JsonValueKind.True)
            return args;

        var map = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var prop in args.EnumerateObject())
            map[prop.Name] = JsonSerializer.Deserialize<object?>(prop.Value.GetRawText());
        map["confirmed"] = true;

        var json = JsonSerializer.Serialize(map);
        return ParseObjectElement(json);
    }

    private static JsonElement ParseObjectElement(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
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
