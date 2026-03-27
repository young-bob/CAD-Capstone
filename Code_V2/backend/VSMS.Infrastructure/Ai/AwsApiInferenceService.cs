using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Amazon.Runtime;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Ai;

public class AwsApiInferenceService(
    IConfiguration config,
    ILogger<AwsApiInferenceService> logger) : IAiInferenceService
{
    private static readonly HttpClient Http = new();

    private readonly string _provider = (config["AI:Provider"] ?? "BedrockDirect").Trim();
    private readonly string _region = (config["AI:Region"] ?? "ca-central-1").Trim();
    private readonly string _endpoint = (config["AI:Endpoint"] ?? string.Empty).Trim();
    private readonly string _model = (config["AI:Model"] ?? "us.amazon.nova-2-lite-v1:0").Trim();
    private readonly string _apiKey = (config["AI:ApiKey"] ?? string.Empty).Trim();
    private readonly string _apiKeyHeader = (config["AI:ApiKeyHeader"] ?? "Authorization").Trim();
    private readonly int _timeoutSeconds = ParseInt(config["AI:TimeoutSeconds"], 60, 10, 300);
    private readonly double _defaultTemperature = ParseDouble(config["AI:DefaultTemperature"], 0.2, 0.0, 1.0);
    private readonly int _defaultMaxTokens = ParseInt(config["AI:DefaultMaxTokens"], 900, 128, 4096);

    public async Task<AiInferenceResult> GenerateAsync(
        AiInferenceRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Messages.Count == 0)
            throw new ArgumentException("At least one message is required.");

        if (_provider.Equals("AwsApi", StringComparison.OrdinalIgnoreCase))
            return await GenerateViaApiProxyAsync(request, cancellationToken);

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
            using var client = new AmazonBedrockRuntimeClient(RegionEndpoint.GetBySystemName(_region));

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
    }

    private async Task<AiInferenceResult> GenerateViaApiProxyAsync(
        AiInferenceRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_endpoint))
            throw new InvalidOperationException("AI endpoint is not configured. Set AI:Endpoint.");

        var payloadMessages = new List<object>
        {
            new { role = "system", content = request.SystemPrompt }
        };

        payloadMessages.AddRange(request.Messages
            .Where(m => !string.IsNullOrWhiteSpace(m.Content))
            .Select(m => new
            {
                role = NormalizeRole(m.Role),
                content = m.Content.Trim()
            }));

        var payload = new
        {
            model = _model,
            messages = payloadMessages,
            temperature = request.Temperature < 0 ? _defaultTemperature : request.Temperature,
            max_tokens = request.MaxTokens <= 0 ? _defaultMaxTokens : request.MaxTokens
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, _endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        AddAuthHeaderForProxy(req);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(_timeoutSeconds));

        var response = await Http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        var responseBody = await response.Content.ReadAsStringAsync(cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("AI provider request failed. Status={StatusCode}, Body={Body}",
                (int)response.StatusCode, TrimForLog(responseBody, 500));
            throw new InvalidOperationException($"AI provider error {(int)response.StatusCode}.");
        }

        var content = ExtractAssistantText(responseBody);
        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("AI provider returned an empty response.");

        return new AiInferenceResult(
            content.Trim(),
            Provider: "AWS-ApiProxy",
            Model: _model,
            GeneratedAtUtc: DateTime.UtcNow);
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

    private void AddAuthHeaderForProxy(HttpRequestMessage req)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            return;

        if (_apiKeyHeader.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
        {
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
            return;
        }

        req.Headers.TryAddWithoutValidation(_apiKeyHeader, _apiKey);
    }

    private static string NormalizeRole(string role)
    {
        if (role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            return "assistant";
        if (role.Equals("system", StringComparison.OrdinalIgnoreCase))
            return "system";
        return "user";
    }

    private static string? ExtractAssistantText(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // OpenAI-compatible responses:
        // { choices: [ { message: { content: "..." | [{text:"..."}] } } ] }
        if (root.TryGetProperty("choices", out var choices)
            && choices.ValueKind == JsonValueKind.Array
            && choices.GetArrayLength() > 0)
        {
            var first = choices[0];
            if (first.TryGetProperty("message", out var message)
                && message.TryGetProperty("content", out var content))
            {
                return ReadContentNode(content);
            }
        }

        // Bedrock Converse responses:
        // { output: { message: { content: [{ text: "..." }] } } }
        if (root.TryGetProperty("output", out var output)
            && output.TryGetProperty("message", out var bedrockMessage)
            && bedrockMessage.TryGetProperty("content", out var bedrockContent))
        {
            return ReadContentNode(bedrockContent);
        }

        // Fallback shapes
        if (root.TryGetProperty("content", out var directContent))
            return ReadContentNode(directContent);
        if (root.TryGetProperty("completion", out var completion)
            && completion.ValueKind == JsonValueKind.String)
            return completion.GetString();

        return null;
    }

    private static string? ReadContentNode(JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.String)
            return node.GetString();

        if (node.ValueKind != JsonValueKind.Array)
            return null;

        var parts = new List<string>();
        foreach (var item in node.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var text = item.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                    parts.Add(text);
                continue;
            }

            if (item.ValueKind == JsonValueKind.Object
                && item.TryGetProperty("text", out var textNode)
                && textNode.ValueKind == JsonValueKind.String)
            {
                var text = textNode.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                    parts.Add(text);
            }
        }

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

    private static string TrimForLog(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= max)
            return value;
        return value[..max];
    }
}
