using System.Net.Http.Headers;
using System.Text.Json;

namespace VSMS.Infrastructure.LinkedIn;

public class LinkedInSettings
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

public class LinkedInProfile
{
    public string Sub { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Picture { get; set; } = string.Empty;
}

public class LinkedInService(LinkedInSettings settings)
{
    private static readonly HttpClient _http = new();

    public string GetAuthorizationUrl(string state)
    {
        var scope = Uri.EscapeDataString("openid profile email");
        return $"https://www.linkedin.com/oauth/v2/authorization" +
               $"?response_type=code" +
               $"&client_id={settings.ClientId}" +
               $"&redirect_uri={Uri.EscapeDataString(settings.RedirectUri)}" +
               $"&scope={scope}" +
               $"&state={state}";
    }

    public async Task<LinkedInProfile?> ExchangeCodeForProfileAsync(string code)
    {
        var client = _http;

        // Step 1: Exchange code for access token
        var tokenReq = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = settings.RedirectUri,
            ["client_id"] = settings.ClientId,
            ["client_secret"] = settings.ClientSecret,
        });

        var tokenRes = await client.PostAsync("https://www.linkedin.com/oauth/v2/accessToken", tokenReq);
        if (!tokenRes.IsSuccessStatusCode) return null;

        var tokenJson = await tokenRes.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();
        if (accessToken is null) return null;

        // Step 2: Get profile via OpenID Connect userinfo endpoint
        var profileReq = new HttpRequestMessage(HttpMethod.Get, "https://api.linkedin.com/v2/userinfo");
        profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var profileRes = await client.SendAsync(profileReq);
        if (!profileRes.IsSuccessStatusCode) return null;

        var profileJson = await profileRes.Content.ReadAsStringAsync();
        using var profileDoc = JsonDocument.Parse(profileJson);
        var root = profileDoc.RootElement;

        return new LinkedInProfile
        {
            Sub = root.TryGetProperty("sub", out var sub) ? sub.GetString() ?? "" : "",
            Name = root.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
            Email = root.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "",
            Picture = root.TryGetProperty("picture", out var pic) ? pic.GetString() ?? "" : "",
        };
    }
}
