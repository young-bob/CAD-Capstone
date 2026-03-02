using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class ApplicationGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    private async Task<IApplicationGrain> CreateInitializedApp(ApplicationStatus? initialStatus = null)
    {
        var grain = _grains.GetGrain<IApplicationGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid().ToString());

        if (initialStatus == ApplicationStatus.Waitlisted)
            await grain.Waitlist();

        return grain;
    }

    [Fact]
    public async Task Initialize_StatusIsPending()
    {
        var grain = await CreateInitializedApp();
        var state = await grain.GetState();
        Assert.Equal(ApplicationStatus.Pending, state.Status);
    }

    [Fact]
    public async Task Approve_FromPending_Succeeds()
    {
        var grain = await CreateInitializedApp();
        await grain.Approve();
        Assert.Equal(ApplicationStatus.Approved, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task Reject_FromPending_Succeeds()
    {
        var grain = await CreateInitializedApp();
        await grain.Reject("Not qualified");
        Assert.Equal(ApplicationStatus.Rejected, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task Waitlist_FromPending_Succeeds()
    {
        var grain = await CreateInitializedApp();
        await grain.Waitlist();
        Assert.Equal(ApplicationStatus.Waitlisted, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task Promote_FromWaitlisted_Succeeds()
    {
        var grain = await CreateInitializedApp(ApplicationStatus.Waitlisted);
        await grain.Promote();
        var state = await grain.GetState();
        Assert.Equal(ApplicationStatus.Promoted, state.Status);
        Assert.NotNull(state.ExpirationTime);
    }

    [Fact]
    public async Task AcceptInvitation_FromPromoted_Succeeds()
    {
        var grain = await CreateInitializedApp(ApplicationStatus.Waitlisted);
        await grain.Promote();
        await grain.AcceptInvitation();
        var state = await grain.GetState();
        Assert.Equal(ApplicationStatus.Approved, state.Status);
        Assert.Null(state.ExpirationTime);
    }

    [Fact]
    public async Task Withdraw_FromApproved_Succeeds()
    {
        var grain = await CreateInitializedApp();
        await grain.Approve();
        await grain.Withdraw();
        Assert.Equal(ApplicationStatus.Withdrawn, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task MarkAsNoShow_FromApproved_Succeeds()
    {
        var grain = await CreateInitializedApp();
        await grain.Approve();
        await grain.MarkAsNoShow();
        Assert.Equal(ApplicationStatus.NoShow, (await grain.GetState()).Status);
    }

    [Fact]
    public async Task Approve_FromRejected_Throws()
    {
        var grain = await CreateInitializedApp();
        await grain.Reject("reason");
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Approve());
    }

    [Fact]
    public async Task Withdraw_FromCompleted_Throws()
    {
        var grain = await CreateInitializedApp();
        await grain.Reject("x"); // Terminal state
        // Rejected is also terminal for Withdraw
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Withdraw());
    }

    [Fact]
    public async Task Promote_FromPending_Throws()
    {
        var grain = await CreateInitializedApp();
        // Promote requires Waitlisted
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Promote());
    }

    [Fact]
    public async Task MarkAsNoShow_FromPending_Throws()
    {
        var grain = await CreateInitializedApp();
        // MarkAsNoShow requires Approved
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.MarkAsNoShow());
    }

    [Fact]
    public async Task Withdraw_FromNoShow_Throws()
    {
        var grain = await CreateInitializedApp();
        await grain.Approve();
        await grain.MarkAsNoShow();
        // NoShow is terminal for Withdraw
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Withdraw());
    }

    [Fact]
    public async Task AcceptInvitation_FromPending_Throws()
    {
        var grain = await CreateInitializedApp();
        // AcceptInvitation requires Promoted status
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.AcceptInvitation());
    }

    [Fact]
    public async Task Reject_FromApproved_Throws()
    {
        var grain = await CreateInitializedApp();
        await grain.Approve();
        // Reject only from Pending
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.Reject("reason"));
    }
}
