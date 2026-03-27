namespace VSMS.Abstractions.Services;

public sealed record AiChatMessage(string Role, string Content);

public sealed record AiInferenceRequest(
    string SystemPrompt,
    IReadOnlyList<AiChatMessage> Messages,
    double Temperature = 0.2,
    int MaxTokens = 900);

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
}
