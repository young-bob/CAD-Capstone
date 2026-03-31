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
                        var allTools = AiToolEndpoints.GetAllowedToolDescriptors(http)
                            .OrderBy(t => t.Name)
                            .Select(t => new
                            {
                                name = t.Name,
                                description = t.Description,
                                inputSchema = AiToolEndpoints.BuildToolInputSchema(t.Name)
                            })
                            .ToList();

                        // MCP spec: support optional cursor-based pagination
                        var @params = TryReadParams(rpc);
                        var cursor = GetStringProperty(@params, "cursor");
                        var startIndex = 0;
                        if (!string.IsNullOrEmpty(cursor) && int.TryParse(cursor, out var ci))
                            startIndex = ci;

                        const int pageSize = 100;
                        var page = allTools.Skip(startIndex).Take(pageSize).ToList();
                        var nextCursor = startIndex + pageSize < allTools.Count
                            ? (startIndex + pageSize).ToString()
                            : (string?)null;

                        var result = nextCursor is not null
                            ? (object)new { tools = page, nextCursor }
                            : new { tools = page };

                        return Results.Json(Success(id, result));
                    }

                    case "tools/call":
                    {
                        var @params = TryReadParams(rpc);
                        var toolName = GetStringProperty(@params, "name");
                        if (string.IsNullOrWhiteSpace(toolName))
                            return Results.Json(Error(id, -32602, "Invalid params: tools/call requires 'name'."));

                        var allowed = AiToolEndpoints.ResolveAllowedTools(http);
                        if (!allowed.Contains(toolName))
                            return Results.Json(Error(id, -32602, $"Unknown tool: {toolName}"));

                        var args = GetObjectPropertyOrEmpty(@params, "arguments");

                        // MCP spec: tool execution errors → result with isError=true (not JSON-RPC error)
                        try
                        {
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

                            var text = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = false });

                            return Results.Json(Success(id, new
                            {
                                content = new[]
                                {
                                    new { type = "text", text }
                                },
                                isError = false
                            }));
                        }
                        catch (Exception toolEx)
                        {
                            // Per MCP spec: tool execution failures are returned as result with isError=true
                            return Results.Json(Success(id, new
                            {
                                content = new[]
                                {
                                    new { type = "text", text = $"Tool execution failed: {toolEx.Message}" }
                                },
                                isError = true
                            }));
                        }
                    }

                    case "ping":
                        return Results.Json(Success(id, new { }));

                    default:
                        return Results.Json(Error(id, -32601, $"Method not found: {method}"));
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(Error(id, -32003, ex.Message));
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

