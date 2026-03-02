using System.Net.Http.Headers;

namespace VSMS.Tests.Integration.E2E.Infrastructure;

public static class TestExtensions
{
    /// <summary>
    /// Authenticates the HttpClient as a specific role and user ID for the TestAuthHandler.
    /// </summary>
    public static HttpClient AsUser(this HttpClient client, string role, Guid userId)
    {
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthHeaderName);
        client.DefaultRequestHeaders.Add(TestAuthHandler.AuthHeaderName, $"{role}:{userId}");
        return client;
    }

    public static HttpClient AsVolunteer(this HttpClient client, Guid volunteerId) =>
        client.AsUser("Volunteer", volunteerId);

    public static HttpClient AsCoordinator(this HttpClient client, Guid orgId) =>
        client.AsUser("Coordinator", orgId);

    public static HttpClient AsSystemAdmin(this HttpClient client, Guid adminId) =>
        client.AsUser("SystemAdmin", adminId);

    public static HttpClient ClearAuth(this HttpClient client)
    {
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthHeaderName);
        return client;
    }
}
