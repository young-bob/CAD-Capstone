using System.Net.Http.Json;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.States;
using VSMS.Tests.Integration.E2E.Infrastructure;
using Xunit;

namespace VSMS.Tests.Integration.E2E.Scenarios;

[Collection(ClusterCollection.Name)] // Must use the same collection to share TestCluster and avoid multiple silos
public class E2EApplicationFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public E2EApplicationFlowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CompleteFlow_VolunteerApplies_OrgApproves()
    {
        var adminId = Guid.NewGuid();
        var orgAdminId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var volunteerId = Guid.NewGuid();

        // ============================================
        // 1. ACTOR: SYSTEM ADMIN (Approves Org)
        // ============================================
        _client.AsSystemAdmin(adminId);

        // Setup raw org indirectly (Simulate external creation or direct POST)
        var orgResp = await _client.PostAsJsonAsync("/api/organizations", new
        {
            Name = "Red Cross Test",
            Description = "Blood drive",
            ContactEmail = "a@b.com"
        });

        var createdOrg = await orgResp.Content.ReadFromJsonAsync<CreateOrgResponse>(
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );
        orgId = createdOrg!.OrgId; // Use the REAL orgId
        Assert.NotEqual(Guid.Empty, orgId);

        // Approve the Organization as SystemAdmin
        var approveResp = await _client.PostAsync($"/api/admin/organizations/{orgId}/approve", null);
        approveResp.EnsureSuccessStatusCode();

        var createOppRequest = new
        {
            Title = "Blood Drive",
            Description = "Help out!",
            Category = "Health"
        };

        // ============================================
        // 2. ACTOR: ORG ADMIN (Creates Opportunity)
        // ============================================
        _client.AsCoordinator(orgId);

        var oppResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/opportunities", createOppRequest);
        var createdOpp = await oppResponse.Content.ReadFromJsonAsync<CreateOppResponse>(
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );
        var opportunityId = createdOpp!.OpportunityId;
        Assert.NotEqual(Guid.Empty, opportunityId);

        // Add Shift
        var shiftReq = new
        {
            Name = "Morning",
            StartTime = DateTime.UtcNow.AddDays(1),
            EndTime = DateTime.UtcNow.AddDays(1).AddHours(4),
            MaxCapacity = 10
        };
        await _client.PostAsJsonAsync($"/api/opportunities/{opportunityId}/shifts", shiftReq);

        // Publish
        await _client.PostAsync($"/api/opportunities/{opportunityId}/publish", null);

        // Wait a small moment for CQRS EventBus -> Read Model sync
        await Task.Delay(500);

        // ============================================
        // 3. ACTOR: VOLUNTEER (Finds and Applies)
        // ============================================
        _client.AsVolunteer(volunteerId);

        // Volunteer queries the Read Model
        var allOppsResponse = await _client.GetFromJsonAsync<IEnumerable<OpportunitySummary>>("/api/opportunities");
        var targetOpp = allOppsResponse!.FirstOrDefault(o => o.OpportunityId == opportunityId);

        Assert.NotNull(targetOpp); // <== FAIL FAST IF OPP NOT IN READ MODEL

        // To apply, we need a specific shift ID. Let's fetch the full Opportunity details.
        var targetOppDetail = await _client.GetFromJsonAsync<OpportunityState>($"/api/opportunities/{opportunityId}");
        Assert.NotNull(targetOppDetail);
        Assert.Single(targetOppDetail.Shifts);

        var shiftIdToApply = targetOppDetail.Shifts[0].ShiftId;

        // Volunteer applies
        var applyReq = new { VolunteerId = volunteerId, ShiftId = shiftIdToApply, IdempotencyKey = "test-key-1" };
        var applyResponse = await _client.PostAsJsonAsync($"/api/opportunities/{opportunityId}/apply", applyReq);
        applyResponse.EnsureSuccessStatusCode();

        await Task.Delay(500); // CQRS Sync App Submitted Event -> Read Model

        // ============================================
        // 4. ACTOR: ORG ADMIN (Finds App and Approves)
        // ============================================
        _client.AsCoordinator(orgId);

        var pendingAppsResponse = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/organizations/{orgId}/applications");
        Assert.NotNull(pendingAppsResponse);
        if (!pendingAppsResponse.Any())
        {
            throw new Exception($"Pending apps empty. OrgId: {orgId}, OppId: {opportunityId}");
        }

        var foundApp = pendingAppsResponse!.FirstOrDefault(a => a.VolunteerId == volunteerId && a.OpportunityId == opportunityId);

        Assert.NotNull(foundApp);
        Assert.Equal(VSMS.Abstractions.Enums.ApplicationStatus.Pending, foundApp.Status);

        var appId = foundApp.ApplicationId;

        // Approve it
        var approveResponse = await _client.PostAsync($"/api/applications/{appId}/approve", null);
        approveResponse.EnsureSuccessStatusCode();

        await Task.Delay(500); // CQRS Sync App Status -> Read Model

        // ============================================
        // 5. ACTOR: VOLUNTEER (Verifies Approval)
        // ============================================
        _client.AsVolunteer(volunteerId);

        var myApps = await _client.GetFromJsonAsync<IEnumerable<Guid>>($"/api/volunteers/{volunteerId}/applications");
        Assert.NotNull(myApps);
        Assert.Contains(appId, myApps);
    }

    private record CreateOppResponse(Guid OpportunityId);
    private record CreateOrgResponse(Guid OrgId);
}
