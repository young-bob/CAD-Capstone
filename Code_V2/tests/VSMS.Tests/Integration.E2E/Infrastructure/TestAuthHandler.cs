using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VSMS.Tests.Integration.E2E.Infrastructure;

public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string AuthenticationScheme = "TestScheme";
    public const string AuthHeaderName = "X-Test-Auth";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(AuthHeaderName, out var authHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var headerValue = authHeader.ToString();
        var parts = headerValue.Split(':', 2);
        if (parts.Length != 2)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid test auth header format. Expected Role:UserId"));
        }

        var role = parts[0];
        var userId = parts[1];

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        };

        var identity = new ClaimsIdentity(claims, AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, AuthenticationScheme);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
