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

            try
            {
                var result = await inference.GenerateAsync(
                    new AiInferenceRequest(prompt, cleaned, temperature, maxTokens),
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
                If the question asks for system data, answer with current values from backend context only.
                """,
            "Coordinator" =>
                """
                You are the VSMS AI assistant for a Coordinator.
                Focus on event management, applications, attendance, members, and certificates.
                Keep instructions practical and concise.
                """,
            _ =>
                """
                You are the VSMS AI assistant for a Volunteer.
                Focus on finding opportunities, applications, attendance, profile, skills, and certificates.
                Keep answers friendly, concrete, and concise.
                """
        };

        if (string.IsNullOrWhiteSpace(currentView))
            return basePrompt;

        return $"{basePrompt}\nCurrent web page: {currentView.Trim()}";
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
