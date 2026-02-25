using System;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Moq;
using VSMS.API.Controllers;
using VSMS.Grains.Interfaces;
using Xunit;

namespace VSMS.API.Tests;

public class CoordinatorControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CoordinatorControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SetOrganization_ReturnsOk_WhenValidDataProvided()
    {
        // Arrange
        var coordId = Guid.NewGuid();
        var mockCoordGrain = new Mock<ICoordinatorGrain>();

        var request = new SetOrganizationRequest(Guid.NewGuid().ToString());

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<ICoordinatorGrain>(coordId, null))
            .Returns(mockCoordGrain.Object);

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync($"/api/coordinator/{coordId}/organization", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        mockCoordGrain.Verify(g => g.SetOrganization(It.Is<string>(id => id == request.OrganizationId)), Times.Once);
    }

    [Fact]
    public async Task CreateShift_ReturnsOk_WhenValidDataProvided()
    {
        // Arrange
        var coordId = Guid.NewGuid();
        var mockCoordGrain = new Mock<ICoordinatorGrain>();

        var request = new CreateShiftRequest(Guid.NewGuid());

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<ICoordinatorGrain>(coordId, null))
            .Returns(mockCoordGrain.Object);

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync($"/api/coordinator/{coordId}/shift", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        mockCoordGrain.Verify(g => g.CreateShift(It.Is<Guid>(id => id == request.OpportunityId)), Times.Once);
    }
}
