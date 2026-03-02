using System.Net.Http.Json;
using VSMS.Abstractions.DTOs;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.States;
using VSMS.Tests.Integration.E2E.Infrastructure;
using Xunit;

namespace VSMS.Tests.Integration.E2E.Scenarios;

[Collection(ClusterCollection.Name)] // Share TestCluster and avoid multiple silos
public class E2EAttendanceAndDisputeFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public E2EAttendanceAndDisputeFlowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CompleteFlow_VolunteerChecksIn_Disputes_AdminResolves()
    {
        var adminId = Guid.NewGuid();
        var orgAdminId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var volunteerId = Guid.NewGuid();

        // ============================================
        // 1. ACTOR: SYSTEM ADMIN (Approves Org)
        // ============================================
        _client.AsSystemAdmin(adminId);

        var orgResp = await _client.PostAsJsonAsync("/api/organizations", new
        {
            Name = "Dispute Flow Org",
            Description = "Test Attendance",
            ContactEmail = "dispute@b.com"
        });

        var createdOrg = await orgResp.Content.ReadFromJsonAsync<CreateOrgResponse>(
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );
        orgId = createdOrg!.OrgId;

        var approveResp = await _client.PostAsync($"/api/admin/organizations/{orgId}/approve", null);
        approveResp.EnsureSuccessStatusCode();

        // ============================================
        // 2. ACTOR: ORG ADMIN (Creates Opportunity)
        // ============================================
        _client.AsCoordinator(orgId);

        var oppResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/opportunities", new
        {
            Title = "Park Cleanup",
            Description = "Attendance test",
            Category = "Environment"
        });
        var createdOpp = await oppResponse.Content.ReadFromJsonAsync<CreateOppResponse>(
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );
        var opportunityId = createdOpp!.OpportunityId;

        await _client.PostAsJsonAsync($"/api/opportunities/{opportunityId}/shifts", new
        {
            Name = "All Day",
            StartTime = DateTime.UtcNow.AddHours(1),
            EndTime = DateTime.UtcNow.AddHours(8),
            MaxCapacity = 5
        });

        await _client.PostAsync($"/api/opportunities/{opportunityId}/publish", null);

        await Task.Delay(500); // CQRS EventBus -> Read Model sync

        // ============================================
        // 3. ACTOR: VOLUNTEER (Finds and Applies)
        // ============================================
        _client.AsVolunteer(volunteerId);

        var allOppsResponse = await _client.GetFromJsonAsync<IEnumerable<OpportunitySummary>>("/api/opportunities");
        var targetOpp = allOppsResponse!.FirstOrDefault(o => o.OpportunityId == opportunityId);
        Assert.NotNull(targetOpp);

        var targetOppDetail = await _client.GetFromJsonAsync<OpportunityState>($"/api/opportunities/{opportunityId}");
        Assert.NotNull(targetOppDetail);

        var shiftIdToApply = targetOppDetail.Shifts[0].ShiftId;

        var applyResponse = await _client.PostAsJsonAsync($"/api/opportunities/{opportunityId}/apply", new
        {
            VolunteerId = volunteerId,
            ShiftId = shiftIdToApply,
            IdempotencyKey = "checkin-test-1"
        });
        applyResponse.EnsureSuccessStatusCode();

        await Task.Delay(500); // CQRS Sync

        // ============================================
        // 4. ACTOR: ORG ADMIN (Finds App and Approves)
        // ============================================
        _client.AsCoordinator(orgId);

        var pendingAppsResponse = await _client.GetFromJsonAsync<IEnumerable<ApplicationSummary>>($"/api/organizations/{orgId}/applications");
        var foundApp = pendingAppsResponse!.FirstOrDefault(a => a.VolunteerId == volunteerId && a.OpportunityId == opportunityId);

        Assert.NotNull(foundApp);
        var appId = foundApp.ApplicationId;

        var orgApproveResp = await _client.PostAsync($"/api/applications/{appId}/approve", null);
        orgApproveResp.EnsureSuccessStatusCode();

        await Task.Delay(500); // CQRS Sync

        // ============================================
        // 5. ACTOR: VOLUNTEER (Checks In, Checks Out, Raises Dispute)
        // ============================================
        _client.AsVolunteer(volunteerId);

        var myApps = await _client.GetFromJsonAsync<IEnumerable<Guid>>($"/api/volunteers/{volunteerId}/applications");
        Assert.NotNull(myApps);
        Assert.Contains(appId, myApps!); // Must be approved and in list

        var attendanceId = Guid.NewGuid(); // Or fetch existing if initialized by Application Grain, but explicitly initing here

        var initResp = await _client.PostAsJsonAsync($"/api/attendance/{attendanceId}/init", new
        {
            VolunteerId = volunteerId,
            ApplicationId = appId,
            OpportunityId = opportunityId
        });
        initResp.EnsureSuccessStatusCode();

        var checkinResp = await _client.PostAsJsonAsync($"/api/attendance/{attendanceId}/checkin", new
        {
            Lat = 45.4215,
            Lon = -75.6972,
            ProofPhotoUrl = "https://example.com/photo.jpg"
        });
        checkinResp.EnsureSuccessStatusCode();

        var checkoutResp = await _client.PostAsync($"/api/attendance/{attendanceId}/checkout", null);
        checkoutResp.EnsureSuccessStatusCode();

        // Raise a dispute about the hours
        var disputeResp = await _client.PostAsJsonAsync($"/api/attendance/{attendanceId}/dispute", new
        {
            Reason = "Forgot to check out, system logged 0 hours. I worked 5 hours.",
            EvidenceUrl = "https://example.com/evidence.pdf"
        });
        disputeResp.EnsureSuccessStatusCode();

        await Task.Delay(500); // CQRS Sync for EventBus -> Dispute Read Model

        // ============================================
        // 6. ACTOR: SYSTEM ADMIN (Resolves Dispute)
        // ============================================
        _client.AsSystemAdmin(adminId);

        var pendingDisputes = await _client.GetFromJsonAsync<IEnumerable<DisputeSummary>>("/api/attendance/disputes/pending");
        Assert.NotNull(pendingDisputes);

        // Assert System Admin can find the dispute without knowing IDs beforehand
        var myDispute = pendingDisputes.FirstOrDefault(d => d.AttendanceId == attendanceId);
        Assert.NotNull(myDispute);
        Assert.Equal(volunteerId, myDispute.VolunteerId);

        // System Admin resolves the dispute, generously awarding 5 hours
        var resolveResp = await _client.PostAsJsonAsync($"/api/admin/disputes/{attendanceId}/resolve", new
        {
            Resolution = "Approved manual time log",
            AdjustedHours = 5.0
        });
        resolveResp.EnsureSuccessStatusCode();

        await Task.Delay(500); // Wait for the resolution CQRS Event

        // ============================================
        // 7. ACTOR: VOLUNTEER (Verifies Resolution)
        // ============================================
        _client.AsVolunteer(volunteerId);

        var finalAttendanceState = await _client.GetFromJsonAsync<AttendanceRecordState>($"/api/attendance/{attendanceId}");
        Assert.NotNull(finalAttendanceState);
        Assert.Equal(AttendanceStatus.Resolved, finalAttendanceState.Status);

        Assert.NotNull(finalAttendanceState.DisputeLog);
        Assert.Equal("Approved manual time log", finalAttendanceState.DisputeLog.Resolution);
        Assert.Equal(5.0, finalAttendanceState.DisputeLog.AdjustedHours);
    }

    private record CreateOppResponse(Guid OpportunityId);
    private record CreateOrgResponse(Guid OrgId);
}
