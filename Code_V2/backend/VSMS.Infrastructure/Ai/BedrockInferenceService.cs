using Amazon;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Amazon.Runtime;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Ai;

public class BedrockInferenceService(
    IConfiguration config,
    ILogger<BedrockInferenceService> logger) : IAiInferenceService
{
    private readonly string _region = ReadString(config, "AI:Region", "ca-central-1");
    private readonly string _model = ReadString(config, "AI:Model", "us.amazon.nova-2-lite-v1:0");
    private readonly int _timeoutSeconds = ParseInt(config["AI:TimeoutSeconds"], 60, 10, 300);
    private readonly double _defaultTemperature = ParseDouble(config["AI:DefaultTemperature"], 0.2, 0.0, 1.0);
    private readonly int _defaultMaxTokens = ParseInt(config["AI:DefaultMaxTokens"], 900, 128, 4096);

    public async Task<AiInferenceResult> GenerateAsync(
        AiInferenceRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Messages.Count == 0)
            throw new ArgumentException("At least one message is required.");

        return await GenerateViaBedrockDirectAsync(request, cancellationToken);
    }

    private async Task<AiInferenceResult> GenerateViaBedrockDirectAsync(
        AiInferenceRequest request,
        CancellationToken cancellationToken)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(_timeoutSeconds));

        try
        {
            var clientConfig = new AmazonBedrockRuntimeConfig
            {
                RegionEndpoint = RegionEndpoint.GetBySystemName(_region)
            };
            using var client = new AmazonBedrockRuntimeClient(clientConfig);

            var bedrockRequest = new ConverseRequest
            {
                ModelId = _model,
                System = [new SystemContentBlock { Text = request.SystemPrompt }],
                Messages = BuildBedrockMessages(request.Messages),
                InferenceConfig = new InferenceConfiguration
                {
                    MaxTokens = request.MaxTokens <= 0 ? _defaultMaxTokens : request.MaxTokens,
                    Temperature = (float)(request.Temperature < 0 ? _defaultTemperature : request.Temperature)
                }
            };

            var response = await client.ConverseAsync(bedrockRequest, cts.Token);
            var text = ExtractFromConverseResponse(response);

            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("Bedrock returned an empty response.");

            return new AiInferenceResult(
                text.Trim(),
                Provider: "AWS-BedrockDirect",
                Model: _model,
                GeneratedAtUtc: DateTime.UtcNow);
        }
        catch (AmazonServiceException ex)
        {
            logger.LogWarning(ex, "Bedrock direct request failed. Code={Code}, Status={StatusCode}",
                ex.ErrorCode, (int)ex.StatusCode);
            throw new InvalidOperationException($"Bedrock request failed: {ex.ErrorCode}");
        }
        catch (AmazonClientException ex)
        {
            logger.LogWarning(ex, "Bedrock client initialization/invocation failed.");
            throw new InvalidOperationException($"Bedrock client error: {ex.Message}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected Bedrock direct inference error.");
            throw new InvalidOperationException($"Bedrock unexpected error: {ex.Message}");
        }
    }

    private static List<Message> BuildBedrockMessages(IReadOnlyList<AiChatMessage> messages)
    {
        var list = new List<Message>();
        foreach (var msg in messages)
        {
            if (string.IsNullOrWhiteSpace(msg.Content))
                continue;

            if (msg.Role.Equals("system", StringComparison.OrdinalIgnoreCase))
                continue;

            list.Add(new Message
            {
                Role = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase)
                    ? ConversationRole.Assistant
                    : ConversationRole.User,
                Content = [new ContentBlock { Text = msg.Content.Trim() }]
            });
        }

        return list;
    }

    private static string? ExtractFromConverseResponse(ConverseResponse response)
    {
        if (response.Output?.Message?.Content is null)
            return null;

        var parts = response.Output.Message.Content
            .Where(c => !string.IsNullOrWhiteSpace(c.Text))
            .Select(c => c.Text!.Trim())
            .ToList();

        return parts.Count == 0 ? null : string.Join("\n", parts);
    }

    private static int ParseInt(string? raw, int fallback, int min, int max)
    {
        if (!int.TryParse(raw, out var value))
            return fallback;
        return Math.Clamp(value, min, max);
    }

    private static double ParseDouble(string? raw, double fallback, double min, double max)
    {
        if (!double.TryParse(raw, out var value))
            return fallback;
        return Math.Clamp(value, min, max);
    }

    private static string ReadString(IConfiguration config, string key, string defaultValue)
    {
        var value = config[key];
        return string.IsNullOrWhiteSpace(value) ? defaultValue : value.Trim();
    }
}
