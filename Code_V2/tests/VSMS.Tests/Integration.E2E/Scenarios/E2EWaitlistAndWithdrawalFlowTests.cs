using System.Net.Http.Json;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.States;
using VSMS.Tests.Integration.E2E.Infrastructure;
using Xunit;

namespace VSMS.Tests.Integration.E2E.Scenarios;

[Collection(ClusterCollection.Name)]
public class E2EWaitlistAndWithdrawalFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public E2EWaitlistAndWithdrawalFlowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task WaitlistFlow_FullCapacity_ThenWithdrawalPromotes()
    {
        var adminId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var volunteerAId = Guid.NewGuid();
        var volunteerBId = Guid.NewGuid();

        // 1. SYSTEM ADMIN (Approves Org)
        _client.AsSystemAdmin(adminId);
        var orgResp = await _client.PostAsJsonAsync("/api/organizations", new { Name = "Waitlist Org", ContactEmail = "w@w.com" });
        var createdOrg = await orgResp.Content.ReadFromJsonAsync<CreateOrgResponse>(new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        orgId = createdOrg!.OrgId;

        await _client.PostAsync($"/api/admin/organizations/{orgId}/approve", null);

        // 2. ORG ADMIN (Creates Opportunity with Capacity = 1)
        _client.AsCoordinator(orgId);
        var oppResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/opportunities", new { Title = "Tiny Event" });
        var oppId = (await oppResponse.Content.ReadFromJsonAsync<CreateOppResponse>(new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }))!.OpportunityId;

        await _client.PostAsJsonAsync($"/api/opportunities/{oppId}/shifts", new { Name = "Only 1 Spot", StartTime = DateTime.UtcNow.AddDays(1), EndTime = DateTime.UtcNow.AddDays(1).AddHours(2), MaxCapacity = 1 });
        await _client.PostAsync($"/api/opportunities/{oppId}/publish", null);

        for (int i = 0; i < 15; i++)
        {
            var orgOpps = await _client.GetFromJsonAsync<IEnumerable<OpportunitySummary>>($"/api/organizations/{orgId}/opportunities");
            if (orgOpps != null && orgOpps.Any(o => o.OpportunityId == oppId)) break;
            await Task.Delay(500);
        }

        // 3. VOLUNTEER A (Finds and Applies - Takes the only spot)
        _client.AsVolunteer(volunteerAId);
        var oppDetailA = await _client.GetFromJsonAsync<OpportunityState>($"/api/opportunities/{oppId}");
        var shiftId = oppDetailA!.Shifts[0].ShiftId;

        await _client.PostAsJsonAsync($"/api/opportunities/{oppId}/apply", new { VolunteerId = volunteerAId, ShiftId = shiftId, IdempotencyKey = "va" });
        await Task.Delay(1000);

        // 4. VOLUNTEER B (Finds and Applies - Gets Waitlisted)
        _client.AsVolunteer(volunteerBId);
        await _client.PostAsJsonAsync($"/api/opportunities/{oppId}/apply", new { VolunteerId = volunteerBId, ShiftId = shiftId, IdempotencyKey = "vb" });
        await Task.Delay(1000);

        // 5. VOLUNTEER B Verifies Waitlisted Status constraint via View Models
        var myApps = await _client.GetFromJsonAsync<IEnumerable<Guid>>($"/api/volunteers/{volunteerBId}/applications");

        _client.AsCoordinator(orgId);
        ApplicationSummary? appA = null;
        ApplicationSummary? appB = null;

        for (int i = 0; i < 15; i++)
        {
            var pendingApps = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/applications/opportunity/{oppId}");
            if (pendingApps != null)
            {
                appA = pendingApps.FirstOrDefault(a => a.VolunteerId == volunteerAId);
                appB = pendingApps.FirstOrDefault(a => a.VolunteerId == volunteerBId);

                if (appA != null && appB != null)
                {
                    break;
                }
            }
            await Task.Delay(500);
        }

        Assert.NotNull(appA);
        Assert.NotNull(appB);

        Assert.Equal(ApplicationStatus.Pending, appA!.Status);
        Assert.Equal(ApplicationStatus.Waitlisted, appB!.Status);

        // Org Admin Approves Volunteer A
        await _client.PostAsync($"/api/applications/{appA.ApplicationId}/approve", null);
        await Task.Delay(1000);

        // 6. VOLUNTEER A WITHDRAWS
        _client.AsVolunteer(volunteerAId);
        await _client.PostAsync($"/api/applications/{appA.ApplicationId}/withdraw", null);
        await Task.Delay(1000);

        // 7. ORG ADMIN VERIFIES WAITLIST PROMOTION
        _client.AsCoordinator(orgId);
        ApplicationSummary? updatedAppB = null;

        for (int i = 0; i < 15; i++)
        {
            var updatedApps = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/applications/opportunity/{oppId}");
            if (updatedApps != null)
            {
                updatedAppB = updatedApps.FirstOrDefault(a => a.ApplicationId == appB.ApplicationId);
                if (updatedAppB != null && updatedAppB.Status == ApplicationStatus.Promoted)
                {
                    break;
                }
            }
            await Task.Delay(500);
        }

        Assert.NotNull(updatedAppB);
        // Promotion happens! Volunteer B moves up to Promoted
        Assert.Equal(ApplicationStatus.Promoted, updatedAppB!.Status);
    }

    private record CreateOppResponse(Guid OpportunityId);
    private record CreateOrgResponse(Guid OrgId);
}
