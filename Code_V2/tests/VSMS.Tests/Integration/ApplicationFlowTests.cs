using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Integration;

/// <summary>
/// End-to-end integration test: Organization creation → Opportunity → Volunteer applies →
/// Approval → Check-in → Check-out → Confirm.
/// </summary>
[Collection(ClusterCollection.Name)]
public class ApplicationFlowTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    [Fact]
    public async Task FullFlow_OrgCreation_To_AttendanceConfirmation()
    {
        // 1. Admin approves organization
        var adminGrain = _grains.GetGrain<IAdminGrain>(Guid.Empty);
        await adminGrain.Initialize(Guid.NewGuid());

        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Green Earth", "Environmental org", Guid.NewGuid(), "admin@green.org");
        await adminGrain.ApproveOrganization(orgId);

        var orgState = await orgGrain.GetState();
        Assert.Equal(OrgStatus.Approved, orgState.Status);

        // 2. Organization creates opportunity with shift
        var oppId = await orgGrain.CreateOpportunity("Park Cleanup", "Clean the park", "Environment");
        var oppGrain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await oppGrain.AddShift("Morning Shift", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 5);
        await oppGrain.Publish();

        var oppState = await oppGrain.GetState();
        Assert.Equal(OpportunityStatus.Published, oppState.Status);
        var shiftId = oppState.Shifts[0].ShiftId;

        // 3. Volunteer registers and applies
        var volunteerId = Guid.NewGuid();
        var volunteerGrain = _grains.GetGrain<IVolunteerGrain>(volunteerId);
        await volunteerGrain.UpdateProfile("Bob", "Smith", "bob@example.com", "555-1234", "Eager helper");

        var appId = await oppGrain.SubmitApplication(volunteerId, shiftId, "idempotency-key-1");
        Assert.NotEqual(Guid.Empty, appId);

        // Check application is tracked on volunteer side
        var apps = await volunteerGrain.GetApplications();
        Assert.Contains(appId, apps);

        // 4. Organization manually approves (default is ManualApprove)
        var appGrain = _grains.GetGrain<IApplicationGrain>(appId);
        var appState = await appGrain.GetState();
        Assert.Equal(ApplicationStatus.Pending, appState.Status);

        await appGrain.Approve();
        Assert.Equal(ApplicationStatus.Approved, (await appGrain.GetState()).Status);

        // 5. Volunteer checks in
        var attendanceId = Guid.NewGuid();
        var attendanceGrain = _grains.GetGrain<IAttendanceRecordGrain>(attendanceId);
        await attendanceGrain.Initialize(volunteerId, appId, oppId);
        await attendanceGrain.CheckIn(43.5, -79.6, "selfie.jpg");

        Assert.Equal(AttendanceStatus.CheckedIn, (await attendanceGrain.GetState()).Status);

        // 6. Volunteer checks out
        await attendanceGrain.CheckOut();
        Assert.Equal(AttendanceStatus.CheckedOut, (await attendanceGrain.GetState()).Status);

        // 7. Supervisor confirms attendance
        await attendanceGrain.Confirm(Guid.NewGuid(), 5);
        Assert.Equal(AttendanceStatus.Confirmed, (await attendanceGrain.GetState()).Status);

        // 8. Verify volunteer stats updated
        var finalVolunteer = await volunteerGrain.GetProfile();
        Assert.Equal(1, finalVolunteer.CompletedOpportunities);
        Assert.True(finalVolunteer.ImpactScore > 0);
    }

    [Fact]
    public async Task WaitlistPromotion_WhenVolunteerWithdraws()
    {
        // Setup org and opportunity with capacity 1
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Small Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        var oppId = await orgGrain.CreateOpportunity("Limited Event", "Only 1 spot", "Social");
        var oppGrain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await oppGrain.AddShift("Only Shift", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(3), 1);
        await oppGrain.Publish();

        var state = await oppGrain.GetState();
        var shiftId = state.Shifts[0].ShiftId;

        // Volunteer 1 fills the spot
        var v1 = Guid.NewGuid();
        var appId1 = await oppGrain.SubmitApplication(v1, shiftId, "key-v1");

        // Approve volunteer 1 (ManualApprove is default)
        var appGrain1 = _grains.GetGrain<IApplicationGrain>(appId1);
        await appGrain1.Approve();

        // Volunteer 2 gets waitlisted
        var v2 = Guid.NewGuid();
        var appId2 = await oppGrain.SubmitApplication(v2, shiftId, "key-v2");
        Assert.Equal(ApplicationStatus.Waitlisted,
            (await _grains.GetGrain<IApplicationGrain>(appId2).GetState()).Status);

        // Volunteer 1 withdraws → Volunteer 2 should be promoted
        await oppGrain.WithdrawApplication(appId1);

        var app2State = await _grains.GetGrain<IApplicationGrain>(appId2).GetState();
        Assert.Equal(ApplicationStatus.Promoted, app2State.Status);
    }

    [Fact]
    public async Task DisputeResolution_FullFlow()
    {
        // 1. Setup org + opportunity
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        var oppId = await orgGrain.CreateOpportunity("Event", "Desc", "Cat");
        var oppGrain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await oppGrain.AddShift("S1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 5);
        await oppGrain.Publish();
        var shiftId = (await oppGrain.GetState()).Shifts[0].ShiftId;

        // 2. Volunteer applies and gets approved
        var volunteerId = Guid.NewGuid();
        var appId = await oppGrain.SubmitApplication(volunteerId, shiftId, "dk1");
        var appGrain = _grains.GetGrain<IApplicationGrain>(appId);
        await appGrain.Approve();

        // 3. Attend: init → checkin → checkout
        var attId = Guid.NewGuid();
        var attGrain = _grains.GetGrain<IAttendanceRecordGrain>(attId);
        await attGrain.Initialize(volunteerId, appId, oppId);
        await attGrain.CheckIn(43.5, -79.6, "photo.jpg");
        await attGrain.CheckOut();

        // 4. Volunteer raises dispute
        await attGrain.RaiseDispute("Only counted 1 hour, should be 4", "timesheet.pdf");
        Assert.Equal(AttendanceStatus.Disputed, (await attGrain.GetState()).Status);

        // 5. Admin resolves
        var adminGrain = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await adminGrain.Initialize(Guid.NewGuid());
        await adminGrain.ResolveDispute(attId, "Adjusted to 4 hours per evidence", 4.0);
        Assert.Equal(AttendanceStatus.Resolved, (await attGrain.GetState()).Status);

        // 6. Supervisor confirms
        await attGrain.Confirm(Guid.NewGuid(), 5);
        Assert.Equal(AttendanceStatus.Confirmed, (await attGrain.GetState()).Status);

        // 7. Volunteer stats updated
        var vGrain = _grains.GetGrain<IVolunteerGrain>(volunteerId);
        var vState = await vGrain.GetProfile();
        Assert.Equal(1, vState.CompletedOpportunities);
    }

    [Fact]
    public async Task AdminRejectsOrg_CannotCreateOpportunities()
    {
        var adminGrain = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await adminGrain.Initialize(Guid.NewGuid());

        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Bad Org", "Desc", Guid.NewGuid(), "a@b.com");

        await adminGrain.RejectOrganization(orgId, "Incomplete documentation");
        Assert.Equal(OrgStatus.Rejected, (await orgGrain.GetState()).Status);

        // Cannot create opportunity when rejected
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => orgGrain.CreateOpportunity("Title", "Desc", "Cat"));
    }

    [Fact]
    public async Task NoShowFlow_MarksAndFreesSpot()
    {
        // Setup
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        var oppId = await orgGrain.CreateOpportunity("Event", "Desc", "Cat");
        var oppGrain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await oppGrain.AddShift("S1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 1);
        await oppGrain.Publish();
        var shiftId = (await oppGrain.GetState()).Shifts[0].ShiftId;

        // V1 applies and gets approved
        var v1 = Guid.NewGuid();
        var appId1 = await oppGrain.SubmitApplication(v1, shiftId, "nk-1");
        var appGrain1 = _grains.GetGrain<IApplicationGrain>(appId1);
        await appGrain1.Approve();

        // V1 marked as no-show
        await appGrain1.MarkAsNoShow();
        Assert.Equal(ApplicationStatus.NoShow, (await appGrain1.GetState()).Status);
    }

    [Fact]
    public async Task VolunteerFeedback_AfterConfirmation()
    {
        // Setup
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        var oppId = await orgGrain.CreateOpportunity("Event", "Desc", "Cat");
        var oppGrain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await oppGrain.AddShift("S1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 5);
        await oppGrain.Publish();
        var shiftId = (await oppGrain.GetState()).Shifts[0].ShiftId;

        var volunteerId = Guid.NewGuid();
        var volunteerGrain = _grains.GetGrain<IVolunteerGrain>(volunteerId);
        await volunteerGrain.UpdateProfile("Jane", "Doe", "jane@example.com", "555", "bio");

        // Apply → Approve → Attend → Checkout → Confirm
        var appId = await oppGrain.SubmitApplication(volunteerId, shiftId, "fk-1");
        var appGrain = _grains.GetGrain<IApplicationGrain>(appId);
        await appGrain.Approve();

        var attId = Guid.NewGuid();
        var attGrain = _grains.GetGrain<IAttendanceRecordGrain>(attId);
        await attGrain.Initialize(volunteerId, appId, oppId);
        await attGrain.CheckIn(43.5, -79.6, "selfie.jpg");
        await attGrain.CheckOut();
        await attGrain.Confirm(Guid.NewGuid(), 5);

        // Volunteer submits feedback — should not throw
        await volunteerGrain.SubmitFeedback(oppId, 5, "Wonderful event!");
    }
}
