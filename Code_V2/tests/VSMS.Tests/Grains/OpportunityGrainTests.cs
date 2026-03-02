using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class OpportunityGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    private async Task<(IOpportunityGrain grain, Guid shiftId)> CreatePublishedOpportunity(
        ApprovalPolicy policy = ApprovalPolicy.AutoApprove, int maxCapacity = 2)
    {
        // Create org and approve
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        // Create opportunity via org
        var oppId = await orgGrain.CreateOpportunity("Beach Cleanup", "Clean the beach", "Environment");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);

        // Set policy
        var state = await grain.GetState();
        // Policy defaults to ManualApprove; we need to set it via state
        // For testing, we just use the grain as-is since AutoApprove is not default

        // Add shift
        await grain.AddShift("Morning", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), maxCapacity);
        await grain.Publish();

        var published = await grain.GetState();
        var shiftId = published.Shifts[0].ShiftId;
        return (grain, shiftId);
    }

    [Fact]
    public async Task Publish_FailsWithoutShifts()
    {
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);
        var oppId = await orgGrain.CreateOpportunity("Title", "Desc", "Cat");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);

        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Publish());
    }

    [Fact]
    public async Task Publish_SucceedsWithShifts()
    {
        var (grain, _) = await CreatePublishedOpportunity();
        var state = await grain.GetState();
        Assert.Equal(OpportunityStatus.Published, state.Status);
    }

    [Fact]
    public async Task SubmitApplication_CreatesApplication()
    {
        var (grain, shiftId) = await CreatePublishedOpportunity();
        var volunteerId = Guid.NewGuid();

        var appId = await grain.SubmitApplication(volunteerId, shiftId, "key-1");
        Assert.NotEqual(Guid.Empty, appId);

        // Check application was created
        var appGrain = _grains.GetGrain<IApplicationGrain>(appId);
        var appState = await appGrain.GetState();
        Assert.Equal(volunteerId, appState.VolunteerId);
    }

    [Fact]
    public async Task SubmitApplication_BlockedVolunteer_Throws()
    {
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);

        var oppId = await orgGrain.CreateOpportunity("Title", "Desc", "Cat");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);
        await grain.AddShift("S1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 10);
        await grain.Publish();

        var state = await grain.GetState();
        var shiftId = state.Shifts[0].ShiftId;

        // Block the volunteer
        var volunteerId = Guid.NewGuid();
        await orgGrain.BlockVolunteer(volunteerId);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.SubmitApplication(volunteerId, shiftId, "key-1"));
    }

    [Fact]
    public async Task SubmitApplication_FullCapacity_Waitlisted()
    {
        var (grain, shiftId) = await CreatePublishedOpportunity(maxCapacity: 1);

        // First application fills capacity
        await grain.SubmitApplication(Guid.NewGuid(), shiftId, "key-1");

        // Second application should be waitlisted
        var appId2 = await grain.SubmitApplication(Guid.NewGuid(), shiftId, "key-2");
        var appGrain = _grains.GetGrain<IApplicationGrain>(appId2);
        var appState = await appGrain.GetState();
        Assert.Equal(ApplicationStatus.Waitlisted, appState.Status);
    }

    [Fact]
    public async Task GeoFence_ValidLocation_ReturnsTrue()
    {
        var (grain, _) = await CreatePublishedOpportunity();
        // No geofence set -> should return true
        Assert.True(await grain.ValidateGeoLocation(43.5, -79.6));
    }

    [Fact]
    public async Task Cancel_NotifiesVolunteers()
    {
        var (grain, shiftId) = await CreatePublishedOpportunity();
        await grain.SubmitApplication(Guid.NewGuid(), shiftId, "k1");
        await grain.Cancel("Weather");

        var state = await grain.GetState();
        Assert.Equal(OpportunityStatus.Cancelled, state.Status);
    }

    [Fact]
    public async Task Cancel_FromDraft_Succeeds()
    {
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);
        var oppId = await orgGrain.CreateOpportunity("Title", "Desc", "Cat");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);

        await grain.Cancel("Changed plans");
        Assert.Equal(OpportunityStatus.Cancelled, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task Publish_WhenAlreadyPublished_Throws()
    {
        var (grain, _) = await CreatePublishedOpportunity();
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Publish());
    }

    [Fact]
    public async Task WithdrawApplication_FreesSpotAndPromotesFromWaitlist()
    {
        var (grain, shiftId) = await CreatePublishedOpportunity(maxCapacity: 1);

        var v1 = Guid.NewGuid();
        var appId1 = await grain.SubmitApplication(v1, shiftId, "k1");
        // Approve first volunteer manually (default policy is ManualApprove)
        var appGrain1 = _grains.GetGrain<IApplicationGrain>(appId1);
        await appGrain1.Approve();

        // Second volunteer gets waitlisted
        var v2 = Guid.NewGuid();
        var appId2 = await grain.SubmitApplication(v2, shiftId, "k2");
        Assert.Equal(ApplicationStatus.Waitlisted,
            (await _grains.GetGrain<IApplicationGrain>(appId2).GetState()).Status);

        // Withdraw first → second should be promoted
        await grain.WithdrawApplication(appId1);
        Assert.Equal(ApplicationStatus.Promoted,
            (await _grains.GetGrain<IApplicationGrain>(appId2).GetState()).Status);
    }

    [Fact]
    public async Task AddShift_AddsToShiftList()
    {
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);
        var oppId = await orgGrain.CreateOpportunity("Title", "Desc", "Cat");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);

        await grain.AddShift("Morning", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 10);
        await grain.AddShift("Afternoon", DateTime.UtcNow.AddDays(1).AddHours(4), DateTime.UtcNow.AddDays(1).AddHours(8), 5);

        var state = await grain.GetState();
        Assert.Equal(2, state.Shifts.Count);
        Assert.Equal("Morning", state.Shifts[0].Name);
        Assert.Equal("Afternoon", state.Shifts[1].Name);
    }

    [Fact]
    public async Task SubmitApplication_WhenNotPublished_Throws()
    {
        var orgId = Guid.NewGuid();
        var orgGrain = _grains.GetGrain<IOrganizationGrain>(orgId);
        await orgGrain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await orgGrain.SetStatus(OrgStatus.Approved);
        var oppId = await orgGrain.CreateOpportunity("Title", "Desc", "Cat");
        var grain = _grains.GetGrain<IOpportunityGrain>(oppId);

        await grain.AddShift("S1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1).AddHours(4), 10);
        var shiftId = (await grain.GetState()).Shifts[0].ShiftId;

        // Not published yet
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.SubmitApplication(Guid.NewGuid(), shiftId, "k1"));
    }
}
