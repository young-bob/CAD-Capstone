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

            var role = ResolveRole(http);
            var prompt = BuildRolePrompt(role, req.CurrentView);
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

                return Results.Ok(new AiChatResponse(
                    result.Content,
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

    private static string BuildRolePrompt(string role, string? currentView)
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
                """,
            "Coordinator" =>
                """
                You are the VSMS AI assistant for a Coordinator.
                Focus on event management, applications, attendance, members, and certificates.
                Use available tools to fetch factual data before answering.
                Keep instructions practical and concise.
                """,
            _ =>
                """
                You are the VSMS AI assistant for a Volunteer.
                Focus on finding opportunities, applications, attendance, profile, skills, and certificates.
                Use available tools to fetch factual data before answering.
                Keep answers friendly, concrete, and concise.
                """
        };

        if (string.IsNullOrWhiteSpace(currentView))
            return basePrompt;

        return $"{basePrompt}\nCurrent web page: {currentView.Trim()}";
    }

    private static object BuildToolInputSchema(string toolName)
    {
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
}

public sealed record AiChatRequest(
    List<AiChatTurnRequest> Messages,
    string? CurrentView = null,
    double? Temperature = null,
    int? MaxTokens = null);

public sealed record AiChatTurnRequest(string Role, string Content);

public sealed record AiChatResponse(
    string Reply,
    string Provider,
    string Model,
    string Role,
    DateTime GeneratedAtUtc);
