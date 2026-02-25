using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class OrganizationGrainTests
{
    private readonly ClusterFixture _fixture;

    public OrganizationGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task UpdateAndGetProfile_ShouldSaveAndRetrieveCorrectly()
    {
        // Arrange
        var orgId = Guid.NewGuid();
        var orgGrain = _fixture.Cluster.GrainFactory.GetGrain<IOrganizationGrain>(orgId.ToString());

        var location = new Location(43.0, -80.0, "123 Charity Lane", "Toronto", "ON", "M5A1B2");
        var profile = new OrganizationProfile(
            orgId,
            "Tech Rescue",
            "Helping communities with tech.",
            "http://logo.url",
            "http://techrescue.org",
            location,
            "PROOF123",
            true,
            "http://calendar.url"
        );

        // Act
        await orgGrain.UpdateProfile(profile);
        var retrieved = await orgGrain.GetProfile();

        // Assert
        Assert.NotNull(retrieved);
        Assert.Equal(profile.Name, retrieved.Name);
        Assert.Equal(profile.Description, retrieved.Description);
        Assert.True(retrieved.IsVerified);
    }

    [Fact]
    public async Task PublishOpportunity_ShouldAddOpportunityToList()
    {
        // Arrange
        var orgId = Guid.NewGuid();
        var orgGrain = _fixture.Cluster.GrainFactory.GetGrain<IOrganizationGrain>(orgId.ToString());
        var oppId1 = Guid.NewGuid();
        var oppId2 = Guid.NewGuid();

        // Act
        await orgGrain.PublishOpportunity(oppId1);
        await orgGrain.PublishOpportunity(oppId2);
        // Add same one again to test idempotency
        await orgGrain.PublishOpportunity(oppId1);

        var opportunities = await orgGrain.GetPublishedOpportunities();

        // Assert
        Assert.NotNull(opportunities);
        Assert.Equal(2, opportunities.Count);
        Assert.Contains(oppId1, opportunities);
        Assert.Contains(oppId2, opportunities);
    }
}
