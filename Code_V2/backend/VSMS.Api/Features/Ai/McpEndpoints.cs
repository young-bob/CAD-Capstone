using System.Text.Json;
using Orleans;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Ai;

public static class McpEndpoints
{
    public static void MapMcpEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/mcp").WithTags("MCP").RequireAuthorization();

        group.MapPost("", async (
            JsonElement rpc,
            HttpContext http,
            AppDbContext db,
            IGrainFactory grains,
            IOrganizationQueryService organizationQueryService,
            IOpportunityQueryService opportunityQueryService,
            IApplicationQueryService applicationQueryService,
            IAttendanceQueryService attendanceQueryService) =>
        {
            var id = TryReadId(rpc);
            var method = TryReadString(rpc, "method");

            if (string.IsNullOrWhiteSpace(method))
                return Results.Json(Error(id, -32600, "Invalid Request: method is required."));

            try
            {
                switch (method)
                {
                    case "initialize":
                        return Results.Json(Success(id, new
                        {
                            protocolVersion = "2024-11-05",
                            capabilities = new
                            {
                                tools = new
                                {
                                    listChanged = false
                                }
                            },
                            serverInfo = new
                            {
                                name = "vsms-mcp",
                                version = "1.0.0"
                            }
                        }));

                    case "tools/list":
                    {
                        var tools = AiToolEndpoints.GetAllowedToolDescriptors(http)
                            .OrderBy(t => t.Name)
                            .Select(t => new
                            {
                                name = t.Name,
                                description = t.Description,
                                inputSchema = AiToolEndpoints.BuildToolInputSchema(t.Name)
                            })
                            .ToList();

                        return Results.Json(Success(id, new { tools }));
                    }

                    case "tools/call":
                    {
                        var @params = TryReadParams(rpc);
                        var toolName = GetStringProperty(@params, "name");
                        if (string.IsNullOrWhiteSpace(toolName))
                            return Results.Json(Error(id, -32602, "Invalid params: tools/call requires 'name'."));

                        var allowed = AiToolEndpoints.ResolveAllowedTools(http);
                        if (!allowed.Contains(toolName))
                            return Results.Json(Error(id, -32001, $"Tool '{toolName}' is not allowed for this role."));

                        var args = GetObjectPropertyOrEmpty(@params, "arguments");
                        var data = await AiToolEndpoints.ExecuteToolAsync(
                            toolName,
                            args,
                            http,
                            db,
                            grains,
                            organizationQueryService,
                            opportunityQueryService,
                            applicationQueryService,
                            attendanceQueryService);

                        var text = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });

                        return Results.Json(Success(id, new
                        {
                            content = new[]
                            {
                                new { type = "text", text }
                            },
                            structuredContent = data,
                            isError = false
                        }));
                    }

                    case "ping":
                        return Results.Json(Success(id, new { ok = true, utc = DateTime.UtcNow }));

                    default:
                        return Results.Json(Error(id, -32601, $"Method not found: {method}"));
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(Error(id, -32003, ex.Message));
            }
            catch (ArgumentException ex)
            {
                return Results.Json(Error(id, -32602, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(Error(id, -32010, ex.Message));
            }
            catch (Exception ex)
            {
                return Results.Json(Error(id, -32603, $"Internal error: {ex.Message}"));
            }
        });
    }

    private static object Success(object? id, object result)
    {
        return new
        {
            jsonrpc = "2.0",
            id,
            result
        };
    }

    private static object Error(object? id, int code, string message)
    {
        return new
        {
            jsonrpc = "2.0",
            id,
            error = new
            {
                code,
                message
            }
        };
    }

    private static object? TryReadId(JsonElement rpc)
    {
        if (!rpc.TryGetProperty("id", out var idNode))
            return null;

        return JsonSerializer.Deserialize<object>(idNode.GetRawText());
    }

    private static string? TryReadString(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var p))
            return null;
        return p.ValueKind == JsonValueKind.String ? p.GetString() : p.ToString();
    }

    private static JsonElement TryReadParams(JsonElement rpc)
    {
        if (!rpc.TryGetProperty("params", out var p))
            return ParseObject("{}");
        return p.ValueKind == JsonValueKind.Object ? p : ParseObject("{}");
    }

    private static string? GetStringProperty(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var p))
            return null;
        return p.ValueKind == JsonValueKind.String ? p.GetString() : p.ToString();
    }

    private static JsonElement GetObjectPropertyOrEmpty(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var p))
            return ParseObject("{}");
        return p.ValueKind == JsonValueKind.Object ? p : ParseObject("{}");
    }

    private static JsonElement ParseObject(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        return doc.RootElement.Clone();
    }

}

