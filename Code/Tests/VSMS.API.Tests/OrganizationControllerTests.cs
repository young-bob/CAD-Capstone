using System;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Moq;
using VSMS.API.Controllers;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.API.Tests;

public class OrganizationControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OrganizationControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetProfile_ReturnsOk_WhenProfileExists()
    {
        // Arrange
        var orgId = Guid.NewGuid().ToString();
        var mockOrgGrain = new Mock<IOrganizationGrain>();

        var mockProfile = new OrganizationProfile(
            Guid.Parse(orgId),
            "Test Org",
            "Description",
            "logo.png",
            "website.com",
            new Location(0, 0, "Address", "City", "Prov", "Pos"),
            "Proof",
            true,
            "cal.org"
        );

        mockOrgGrain.Setup(g => g.GetProfile()).ReturnsAsync(mockProfile);

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<IOrganizationGrain>(orgId, null))
            .Returns(mockOrgGrain.Object);

        // Act
        var response = await _client.GetAsync($"/api/organization/{orgId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseString = await response.Content.ReadAsStringAsync();
        Assert.Contains("Test Org", responseString);
    }

    [Fact]
    public async Task UpdateProfile_ReturnsOk_WhenValidDataProvided()
    {
        // Arrange
        var orgId = Guid.NewGuid().ToString();
        var mockOrgGrain = new Mock<IOrganizationGrain>();

        var updateProfile = new OrganizationProfile(
            Guid.Parse(orgId),
            "Updated Org",
            "New Description",
            "logo.png",
            "website.com",
            new Location(0, 0, "Address", "City", "Prov", "Pos"),
            "Proof",
            true,
            "cal.org"
        );

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<IOrganizationGrain>(orgId, null))
            .Returns(mockOrgGrain.Object);

        var content = new StringContent(JsonSerializer.Serialize(updateProfile), Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync($"/api/organization/{orgId}", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        mockOrgGrain.Verify(g => g.UpdateProfile(It.IsAny<OrganizationProfile>()), Times.Once);
    }
}
