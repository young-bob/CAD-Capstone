using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class AdminGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    [Fact]
    public async Task Initialize_SetsState()
    {
        var grain = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        var userId = Guid.NewGuid();
        await grain.Initialize(userId);

        var state = await grain.GetState();
        Assert.Equal(userId, state.UserId);
        Assert.Equal(AdminRole.SuperAdmin, state.Role);
        Assert.True(state.IsInitialized);
    }

    [Fact]
    public async Task ApproveOrganization_SetsApproved()
    {
        var admin = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await admin.Initialize(Guid.NewGuid());

        var orgId = Guid.NewGuid();
        var org = _grains.GetGrain<IOrganizationGrain>(orgId);
        await org.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");
        Assert.Equal(OrgStatus.PendingApproval, (await org.GetState()).Status);

        await admin.ApproveOrganization(orgId);
        Assert.Equal(OrgStatus.Approved, (await org.GetState()).Status);
    }

    [Fact]
    public async Task RejectOrganization_SetsRejected()
    {
        var admin = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await admin.Initialize(Guid.NewGuid());

        var orgId = Guid.NewGuid();
        var org = _grains.GetGrain<IOrganizationGrain>(orgId);
        await org.Initialize("Org", "Desc", Guid.NewGuid(), "a@b.com");

        await admin.RejectOrganization(orgId, "Incomplete info");
        Assert.Equal(OrgStatus.Rejected, (await org.GetState()).Status);

        // Audit log recorded
        var adminState = await admin.GetState();
        Assert.Contains(adminState.ActionLog, l => l.Action == "RejectOrganization");
    }

    [Fact]
    public async Task BanUser_RecordsAuditLog()
    {
        var admin = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await admin.Initialize(Guid.NewGuid());

        await admin.BanUser(Guid.NewGuid());
        var state = await admin.GetState();
        Assert.Contains(state.ActionLog, l => l.Action == "BanUser");
    }

    [Fact]
    public async Task UnbanUser_RecordsAuditLog()
    {
        var admin = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await admin.Initialize(Guid.NewGuid());

        var userId = Guid.NewGuid();
        await admin.BanUser(userId);
        await admin.UnbanUser(userId);
        var state = await admin.GetState();
        Assert.Contains(state.ActionLog, l => l.Action == "UnbanUser");
    }

    [Fact]
    public async Task ResolveDispute_ViaAdmin_UpdatesAttendance()
    {
        var admin = _grains.GetGrain<IAdminGrain>(Guid.NewGuid());
        await admin.Initialize(Guid.NewGuid());

        // Create attendance with dispute
        var attGrain = _grains.GetGrain<IAttendanceRecordGrain>(Guid.NewGuid());
        await attGrain.Initialize(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await attGrain.CheckIn(43.5, -79.6, "photo.jpg");
        await attGrain.CheckOut();
        await attGrain.RaiseDispute("Wrong hours", "evidence.pdf");

        await admin.ResolveDispute(attGrain.GetPrimaryKey(), "Adjusted", 4.0);

        var attState = await attGrain.GetState();
        Assert.Equal(AttendanceStatus.Resolved, attState.Status);
        Assert.Equal(4.0, attState.DisputeLog!.AdjustedHours);
    }
}
