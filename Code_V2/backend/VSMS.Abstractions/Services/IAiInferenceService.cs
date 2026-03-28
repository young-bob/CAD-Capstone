using System.Text.Json;

namespace VSMS.Abstractions.Services;

public sealed record AiChatMessage(string Role, string Content);

public sealed record AiInferenceRequest(
    string SystemPrompt,
    IReadOnlyList<AiChatMessage> Messages,
    double Temperature = 0.2,
    int MaxTokens = 900);

public sealed record AiInferenceTool(
    string Name,
    string Description,
    object? InputSchema = null);

public sealed record AiInferenceResult(
    string Content,
    string Provider,
    string Model,
    DateTime GeneratedAtUtc);

public interface IAiInferenceService
{
    Task<AiInferenceResult> GenerateAsync(
        AiInferenceRequest request,
        CancellationToken cancellationToken = default);

    Task<AiInferenceResult> GenerateWithToolsAsync(
        AiInferenceRequest request,
        IReadOnlyList<AiInferenceTool> tools,
        Func<string, JsonElement, CancellationToken, Task<object?>> toolExecutor,
        CancellationToken cancellationToken = default);
}
