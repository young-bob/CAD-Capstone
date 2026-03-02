using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class OrganizationGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    [Fact]
    public async Task Initialize_SetsStateCorrectly()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Red Cross", "Humanitarian organization", Guid.NewGuid(), "admin@redcross.org");

        var state = await grain.GetState();
        Assert.Equal("Red Cross", state.Name);
        Assert.Equal(OrgStatus.PendingApproval, state.Status);
        Assert.Single(state.Members);
        Assert.Equal(OrgRole.Admin, state.Members[0].Role);
    }

    [Fact]
    public async Task Initialize_ThrowsIfAlreadyInitialized()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Org1", "Desc", Guid.NewGuid(), "a@b.com");

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.Initialize("Org2", "Desc", Guid.NewGuid(), "c@d.com"));
    }

    [Fact]
    public async Task CreateOpportunity_FailsWhenNotApproved()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Pending Org", "Desc", Guid.NewGuid(), "a@b.com");

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.CreateOpportunity("Title", "Desc", "Cat"));
    }

    [Fact]
    public async Task CreateOpportunity_SucceedsWhenApproved()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Approved Org", "Desc", Guid.NewGuid(), "a@b.com");
        await grain.SetStatus(OrgStatus.Approved);

        var oppId = await grain.CreateOpportunity("Beach Cleanup", "Clean the beach", "Environment");
        Assert.NotEqual(Guid.Empty, oppId);

        var opps = await grain.GetOpportunities();
        Assert.Single(opps);
        Assert.Equal(oppId, opps[0]);
    }

    [Fact]
    public async Task BlockVolunteer_WorksCorrectly()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");

        var volunteerId = Guid.NewGuid();
        Assert.False(await grain.IsVolunteerBlocked(volunteerId));

        await grain.BlockVolunteer(volunteerId);
        Assert.True(await grain.IsVolunteerBlocked(volunteerId));

        await grain.UnblockVolunteer(volunteerId);
        Assert.False(await grain.IsVolunteerBlocked(volunteerId));
    }

    [Fact]
    public async Task InviteMember_AddsToMembersList()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Org", "Desc", Guid.NewGuid(), "admin@org.com");
        await grain.SetStatus(OrgStatus.Approved);

        await grain.InviteMember("coord@org.com", OrgRole.Coordinator);
        var state = await grain.GetState();
        Assert.Equal(2, state.Members.Count); // Admin + Coordinator
        Assert.Equal(OrgRole.Coordinator, state.Members[1].Role);
        Assert.Equal("coord@org.com", state.Members[1].Email);
    }

    [Fact]
    public async Task SetStatus_ChangesStatus()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");

        await grain.SetStatus(OrgStatus.Suspended);
        Assert.Equal(OrgStatus.Suspended, (await grain.GetState()).Status);

        await grain.SetStatus(OrgStatus.Approved);
        Assert.Equal(OrgStatus.Approved, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task InviteMember_WhenNotApproved_Throws()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Pending Org", "Desc", Guid.NewGuid(), "a@b.com");
        // Status is PendingApproval
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.InviteMember("user@org.com", OrgRole.Coordinator));
    }

    [Fact]
    public async Task GetOpportunities_ReturnsCorrectList()
    {
        var grain = _grains.GetGrain<IOrganizationGrain>(Guid.NewGuid());
        await grain.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        await grain.SetStatus(OrgStatus.Approved);

        var oppId1 = await grain.CreateOpportunity("Event 1", "Desc", "Cat");
        var oppId2 = await grain.CreateOpportunity("Event 2", "Desc", "Cat");

        var opps = await grain.GetOpportunities();
        Assert.Equal(2, opps.Count);
        Assert.Contains(oppId1, opps);
        Assert.Contains(oppId2, opps);
    }
}
