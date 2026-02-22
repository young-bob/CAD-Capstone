using Microsoft.Extensions.DependencyInjection;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class OpportunityGrainTests
{
    private readonly ClusterFixture _fixture;

    public OpportunityGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task UpdateAndGetDetails_ShouldSaveAndRetrieveCorrectly()
    {
        // Arrange
        var oppId = Guid.NewGuid();
        var oppGrain = _fixture.Cluster.GrainFactory.GetGrain<IOpportunityGrain>(oppId);

        var details = new OpportunityDetails(
            oppId,
            Guid.NewGuid(),
            "Park Cleanup",
            "Help clean up the local park",
            OpportunityVisibility.Public,
            DateTime.UtcNow.AddDays(1),
            DateTime.UtcNow.AddDays(1).AddHours(4),
            new Location(0, 0, "Central Park", "NY", "", ""),
            10.0f,
            20,
            0
        );

        // Act
        await oppGrain.UpdateDetails(details);
        var retrievedDetails = await oppGrain.GetDetails();

        // Assert
        Assert.NotNull(retrievedDetails);
        Assert.Equal(details.Title, retrievedDetails.Title);
        Assert.Equal(details.Description, retrievedDetails.Description);
        Assert.Equal(details.OrganizationId, retrievedDetails.OrganizationId);
    }

    [Fact]
    public async Task SubmitApplication_ShouldAddApplicationToList()
    {
        // Arrange
        var oppId = Guid.NewGuid();
        var oppGrain = _fixture.Cluster.GrainFactory.GetGrain<IOpportunityGrain>(oppId);
        var volunteerId = Guid.NewGuid();

        // Act
        await oppGrain.UpdateDetails(new OpportunityDetails(
            oppId,
            Guid.NewGuid(),
            "Park Cleanup",
            "Help clean up the local park",
            OpportunityVisibility.Public,
            DateTime.UtcNow.AddDays(1),
            DateTime.UtcNow.AddDays(1).AddHours(4),
            new Location(0, 0, "Central Park", "NY", "", ""),
            10.0f,
            20,
            0
        ));
        
        var application = await oppGrain.SubmitApplication(volunteerId, "Can help out!");
        var applications = await oppGrain.GetApplications();

        // Assert
        Assert.NotNull(application);
        Assert.Equal(volunteerId, application.VolunteerId);
        Assert.Equal(ApplicationStatus.Pending, application.Status);
        
        Assert.Single(applications);
        Assert.Equal(application.AppId, applications.First().AppId);
    }
}
