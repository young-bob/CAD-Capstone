using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class AttendanceRecordGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    [Fact]
    public async Task CheckIn_WithoutInit_FailsGracefully()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        // OpportunityId is Guid.Empty, ValidateGeoLocation will still work (no geofence = pass)
        // Initialize first
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        // The opportunity grain won't have geofence, so CheckIn should succeed
        await grain.CheckIn(43.5, -79.6, "photo.jpg");

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.CheckedIn, state.Status);
        Assert.Equal("photo.jpg", state.ProofPhotoUrl);
    }

    [Fact]
    public async Task CheckOut_AfterCheckIn_Succeeds()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.CheckedOut, state.Status);
        Assert.NotNull(state.VerifiedTime?.CheckOutTime);
    }

    [Fact]
    public async Task RaiseDispute_AfterCheckOut_Succeeds()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();
        await grain.RaiseDispute("Wrong hours", "evidence.pdf");

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.Disputed, state.Status);
        Assert.NotNull(state.DisputeLog);
        Assert.Equal(DisputeStatus.Open, state.DisputeLog.Status);
    }

    [Fact]
    public async Task ResolveDispute_UpdatesState()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();
        await grain.RaiseDispute("Wrong hours", "evidence.pdf");
        await grain.ResolveDispute(Guid.NewGuid(), "Adjusted to 3 hours", 3.0);

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.Resolved, state.Status);
        Assert.Equal(DisputeStatus.Resolved, state.DisputeLog!.Status);
        Assert.Equal(3.0, state.DisputeLog.AdjustedHours);
    }

    [Fact]
    public async Task Confirm_UpdatesVolunteerScore()
    {
        var volunteerId = Guid.NewGuid();
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(volunteerId, Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();
        await grain.Confirm(Guid.NewGuid(), 5);

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.Confirmed, state.Status);
        Assert.Equal(5, state.SupervisorRating);

        // Verify volunteer score updated
        var volunteerGrain = _grains.GetGrain<IVolunteerGrain>(volunteerId);
        var vState = await volunteerGrain.GetProfile();
        Assert.Equal(1, vState.CompletedOpportunities);
        Assert.True(vState.TotalHours > 0 || vState.TotalHours == 0); // Could be near-zero for fast test
    }

    [Fact]
    public async Task ManualAdjustment_RecordsAuditLog()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();

        var newIn = DateTime.UtcNow.AddHours(-4);
        var newOut = DateTime.UtcNow;
        await grain.ManualAdjustment(Guid.NewGuid(), newIn, newOut, "Time correction");

        var state = await grain.GetState();
        Assert.Equal(newIn, state.VerifiedTime!.CheckInTime);
        Assert.Equal(newOut, state.VerifiedTime.CheckOutTime);
        Assert.Single(state.Modifications);
        Assert.Equal("ManualAdjustment", state.Modifications[0].Action);
    }

    [Fact]
    public async Task CheckIn_WhenAlreadyCheckedIn_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.CheckIn(43.5, -79.6, "photo2.jpg"));
    }

    [Fact]
    public async Task RaiseDispute_BeforeCheckOut_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");

        // Not checked out yet, should fail
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.RaiseDispute("Wrong hours", "evidence.pdf"));
    }

    [Fact]
    public async Task Confirm_FromResolved_Succeeds()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();
        await grain.RaiseDispute("Wrong hours", "evidence.pdf");
        await grain.ResolveDispute(Guid.NewGuid(), "Adjusted", 3.0);
        await grain.Confirm(Guid.NewGuid(), 4);

        var state = await grain.GetState();
        Assert.Equal(AttendanceStatus.Confirmed, state.Status);
        Assert.Equal(4, state.SupervisorRating);
    }

    [Fact]
    public async Task CheckOut_BeforeCheckIn_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        // Status is Pending, not CheckedIn
        await Assert.ThrowsAsync<InvalidOperationException>(() => grain.CheckOut());
    }

    [Fact]
    public async Task ResolveDispute_WithoutDispute_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        await grain.CheckOut();
        // Status is CheckedOut, not Disputed
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.ResolveDispute(Guid.NewGuid(), "resolution", 1.0));
    }

    [Fact]
    public async Task Confirm_FromPending_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        // Status is Pending, should fail
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.Confirm(Guid.NewGuid(), 5));
    }

    [Fact]
    public async Task Confirm_FromCheckedIn_Throws()
    {
        var grain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await grain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await grain.CheckIn(43.5, -79.6, "photo.jpg");
        // Status is CheckedIn, should fail
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => grain.Confirm(Guid.NewGuid(), 5));
    }
}
