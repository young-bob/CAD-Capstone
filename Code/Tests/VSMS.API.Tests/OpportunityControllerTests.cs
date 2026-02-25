using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Moq;
using VSMS.API.Controllers;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Enums;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.API.Tests;

public class OpportunityControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OpportunityControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetOpportunity_ReturnsOk_WhenFound()
    {
        // Arrange
        var oppId = Guid.NewGuid();
        var mockOppGrain = new Mock<IOpportunityGrain>();
        
        var mockDetails = new OpportunityDetails(
            oppId,
            Guid.NewGuid(),
            "Community Garden Project",
            "Planting trees",
            OpportunityVisibility.Public,
            DateTime.UtcNow,
            DateTime.UtcNow.AddHours(4),
            new Location(0, 0, "123 Garden St", "City", "Prov", "11111"),
            5.0f,
            10,
            0
        );

        mockOppGrain.Setup(g => g.GetDetails()).ReturnsAsync(mockDetails);

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<IOpportunityGrain>(oppId, null))
            .Returns(mockOppGrain.Object);

        // Act
        var response = await _client.GetAsync($"/api/opportunity/{oppId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseString = await response.Content.ReadAsStringAsync();
        Assert.Contains(mockDetails.Title, responseString);
    }
    
    [Fact]
    public async Task CreateOpportunity_ReturnsCreatedAtAction()
    {
        var request = new CreateOpportunityRequest(
            Guid.NewGuid(),
            "Park Cleanup",
            "Clean up the local park",
            OpportunityVisibility.Public,
            DateTime.UtcNow.AddDays(1),
            DateTime.UtcNow.AddDays(1).AddHours(4),
            new Location(0, 0, "Central Park", "City", "Prov", "11111"),
            10.0f,
            20
        );

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

        // Mock OpportunityGrain and OrganizationGrain
        var mockOppGrain = new Mock<IOpportunityGrain>();
        var mockOrgGrain = new Mock<IOrganizationGrain>();

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<IOpportunityGrain>(It.IsAny<Guid>(), null))
            .Returns(mockOppGrain.Object);

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<IOrganizationGrain>(request.OrganizationId.ToString(), null))
            .Returns(mockOrgGrain.Object);

        // Act
        var response = await _client.PostAsync("/api/opportunity", content);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Verify that org grain was notified
        mockOrgGrain.Verify(g => g.PublishOpportunity(It.IsAny<Guid>()), Times.Once);
    }
}
