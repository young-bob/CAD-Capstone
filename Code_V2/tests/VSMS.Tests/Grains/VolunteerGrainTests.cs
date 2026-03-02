using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Enums;

namespace VSMS.Tests.Grains;

[Collection(ClusterCollection.Name)]
public class VolunteerGrainTests(ClusterFixture fixture)
{
    private readonly IGrainFactory _grains = fixture.Cluster.GrainFactory;

    [Fact]
    public async Task UpdateProfile_SetsFieldsCorrectly()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        await grain.UpdateProfile("Alice", "Wang", "alice@example.com", "123-456", "I love volunteering");

        var state = await grain.GetProfile();
        Assert.Equal("Alice", state.FirstName);
        Assert.Equal("Wang", state.LastName);
        Assert.Equal("alice@example.com", state.Email);
        Assert.True(state.IsInitialized);
    }

    [Fact]
    public async Task ApplicationIds_TrackCorrectly()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        var appId1 = Guid.NewGuid();
        var appId2 = Guid.NewGuid();

        await grain.AddApplicationId(appId1);
        await grain.AddApplicationId(appId2);
        var apps = await grain.GetApplications();
        Assert.Equal(2, apps.Count);

        await grain.RemoveApplicationId(appId1);
        apps = await grain.GetApplications();
        Assert.Single(apps);
        Assert.Equal(appId2, apps[0]);
    }

    [Fact]
    public async Task ImpactScore_CalculatesCorrectly()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        await grain.AddCompletedHours(5);        // 5 * 2 = 10
        await grain.IncrementCompletedOpportunities(); // 1 * 10 = 10

        var state = await grain.GetProfile();
        Assert.Equal(5, state.TotalHours);
        Assert.Equal(1, state.CompletedOpportunities);
        Assert.Equal(20, state.ImpactScore); // (5*2) + (1*10)
    }

    [Fact]
    public async Task UploadCredential_AddsToList()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        await grain.UploadCredential("cert-first-aid.pdf");
        await grain.UploadCredential("cert-cpr.pdf");

        var state = await grain.GetProfile();
        Assert.Equal(2, state.Credentials.Count);
        Assert.Contains("cert-first-aid.pdf", state.Credentials);
        Assert.Contains("cert-cpr.pdf", state.Credentials);
    }

    [Fact]
    public async Task SubmitFeedback_DoesNotThrow()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        await grain.UpdateProfile("Test", "User", "test@t.com", "123", "bio");

        // Should not throw
        await grain.SubmitFeedback(Guid.NewGuid(), 5, "Great experience!");
    }

    [Fact]
    public async Task UpdatePrivacySettings_SetsCorrectly()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        await grain.UpdatePrivacySettings(false, true, false);

        var state = await grain.GetProfile();
        Assert.False(state.IsProfilePublic);
    }

    [Fact]
    public async Task IsBlockedByOrg_ReturnsFalseByDefault()
    {
        var grain = _grains.GetGrain<IVolunteerGrain>(Guid.NewGuid());
        Assert.False(await grain.IsBlockedByOrg(Guid.NewGuid()));
    }
}
