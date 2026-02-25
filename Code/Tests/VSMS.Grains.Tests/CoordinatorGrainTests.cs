using System;
using System.Threading.Tasks;
using VSMS.Grains.Interfaces;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class CoordinatorGrainTests
{
    private readonly ClusterFixture _fixture;

    public CoordinatorGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SetOrganization_ShouldUpdateCoordinatorState()
    {
        // Arrange
        var coordinatorId = Guid.NewGuid();
        var coordinatorGrain = _fixture.Cluster.GrainFactory.GetGrain<ICoordinatorGrain>(coordinatorId);
        var orgId = Guid.NewGuid().ToString();

        // Act
        // Current implementation is a void task that stores to persistent memory
        // We will call the method to ensure it doesn't throw exceptions when memory provider is present
        var exception = await Record.ExceptionAsync(() => coordinatorGrain.SetOrganization(orgId));

        // Assert
        Assert.Null(exception);
    }
    
    [Fact]
    public async Task CreateShift_WithoutOrganization_ShouldThrowException()
    {
        // Arrange
        var coordinatorId = Guid.NewGuid();
        var coordinatorGrain = _fixture.Cluster.GrainFactory.GetGrain<ICoordinatorGrain>(coordinatorId);
        var oppId = Guid.NewGuid();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => coordinatorGrain.CreateShift(oppId)
        );
        Assert.Equal("Coordinator not assigned to an organization.", exception.Message);
    }

    [Fact]
    public async Task CreateShift_WithOrganization_ShouldSucceed()
    {
        // Arrange
        var coordinatorId = Guid.NewGuid();
        var coordinatorGrain = _fixture.Cluster.GrainFactory.GetGrain<ICoordinatorGrain>(coordinatorId);
        var orgId = Guid.NewGuid().ToString();
        var oppId = Guid.NewGuid();

        // Act
        await coordinatorGrain.SetOrganization(orgId);
        var exception = await Record.ExceptionAsync(() => coordinatorGrain.CreateShift(oppId));

        // Assert
        Assert.Null(exception);
    }
}
