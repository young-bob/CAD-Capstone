using System;
using System.Text.Json;

public class Program { 
    public static void Main() {
        string json = @" { ""Status"": ""Pending"" } ";
        var args = JsonDocument.Parse(json).RootElement;
        Console.WriteLine(GetPropertyCaseInsensitive(args, "status")?.GetString());
    }

    private static JsonElement? GetPropertyCaseInsensitive(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object) return null;
        if (args.TryGetProperty(name, out var val)) return val;
        foreach (var prop in args.EnumerateObject())
        {
            if (prop.NameEquals(name) || string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                return prop.Value;
        }
        return null;
    }
}
