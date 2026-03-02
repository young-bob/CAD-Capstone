using System.Net.Http.Json;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.States;
using VSMS.Tests.Integration.E2E.Infrastructure;
using Xunit;

namespace VSMS.Tests.Integration.E2E.Scenarios;

[Collection(ClusterCollection.Name)]
public class E2ENoShowFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public E2ENoShowFlowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task NoShowFlow_OrgMarksAbsence_VolunteerAppStatusUpdates()
    {
        var adminId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var volunteerId = Guid.NewGuid();

        // 1. SYSTEM ADMIN (Approves Org)
        _client.AsSystemAdmin(adminId);
        var orgResp = await _client.PostAsJsonAsync("/api/organizations", new { Name = "No-Show Org", ContactEmail = "n@n.com" });
        var createdOrg = await orgResp.Content.ReadFromJsonAsync<CreateOrgResponse>(new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        orgId = createdOrg!.OrgId;

        await _client.PostAsync($"/api/admin/organizations/{orgId}/approve", null);

        // 2. ORG ADMIN (Creates Opportunity)
        _client.AsCoordinator(orgId);
        var oppResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/opportunities", new { Title = "No Show Event" });
        var oppId = (await oppResponse.Content.ReadFromJsonAsync<CreateOppResponse>(new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }))!.OpportunityId;

        await _client.PostAsJsonAsync($"/api/opportunities/{oppId}/shifts", new { Name = "Default Shift", StartTime = DateTime.UtcNow.AddHours(-12), EndTime = DateTime.UtcNow.AddHours(-10), MaxCapacity = 5 });
        await _client.PostAsync($"/api/opportunities/{oppId}/publish", null);

        // Wait for Opportunity Event to hit CQRS Read Model before volunteers apply,
        // otherwise `GetByOrganizationAsync` won't find the OpportunityId.
        for (int i = 0; i < 15; i++)
        {
            var orgOpps = await _client.GetFromJsonAsync<IEnumerable<OpportunitySummary>>($"/api/organizations/{orgId}/opportunities");
            if (orgOpps != null && orgOpps.Any(o => o.OpportunityId == oppId)) break;
            await Task.Delay(500);
        }

        // 3. VOLUNTEER (Finds and Applies)
        _client.AsVolunteer(volunteerId);
        var oppDetail = await _client.GetFromJsonAsync<OpportunityState>($"/api/opportunities/{oppId}");
        var shiftId = oppDetail!.Shifts[0].ShiftId;

        await _client.PostAsJsonAsync($"/api/opportunities/{oppId}/apply", new { VolunteerId = volunteerId, ShiftId = shiftId, IdempotencyKey = "ns1" });
        await Task.Delay(500);

        // 4. ORG ADMIN (Finds App and Approves with Retry)
        _client.AsCoordinator(orgId);
        ApplicationSummary? application = null;
        for (int i = 0; i < 15; i++)
        {
            var pendingApps = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/applications/opportunity/{oppId}");
            if (pendingApps != null)
            {
                application = pendingApps.FirstOrDefault(a => a.VolunteerId == volunteerId);
                if (application != null) break;
            }
            await Task.Delay(500);
        }
        Assert.NotNull(application);

        await _client.PostAsync($"/api/applications/{application.ApplicationId}/approve", null);

        // 5. VOLUNTEER DOES NOT SHOW UP
        // (Time passes, event ends, volunteer never called Init/CheckIn)

        // 6. ORG ADMIN (Marks No Show on the Application Grain)
        _client.AsCoordinator(orgId);
        await _client.PostAsync($"/api/applications/{application.ApplicationId}/noshow", null);
        await Task.Delay(500); // CQRS Event: ApplicationStatusChangedEvent

        // 7. VOLUNTEER OVERVIEW (Sees No-Show in Profile/History)
        _client.AsVolunteer(volunteerId);
        // While the volunteer GET apps list might only return a list of IDs,
        // let's verify via the Organization's public Application list view that the status transitioned correctly down the read models.
        _client.AsCoordinator(orgId);
        var apps = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/applications/opportunity/{oppId}");
        var finalApp = apps?.FirstOrDefault(a => a.ApplicationId == application.ApplicationId);
        Assert.NotNull(finalApp);
        Assert.Equal(ApplicationStatus.NoShow, finalApp.Status);
    }

    private record CreateOppResponse(Guid OpportunityId);
    private record CreateOrgResponse(Guid OrgId);
}
