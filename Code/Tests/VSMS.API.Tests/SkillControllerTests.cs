using System;
using System.Collections.Generic;
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

public class SkillControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SkillControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetSkill_ReturnsOk_WhenSkillExists()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        var mockSkillGrain = new Mock<ISkillGrain>();

        var mockSkill = new Skill(
            skillId,
            "C#",
            "C# Programming"
        );

        mockSkillGrain.Setup(g => g.GetDetails()).ReturnsAsync(mockSkill);

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<ISkillGrain>(skillId, null))
            .Returns(mockSkillGrain.Object);

        // Act
        var response = await _client.GetAsync($"/api/skill/{skillId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var responseString = await response.Content.ReadAsStringAsync();
        Assert.Contains("C# Programming", responseString);
    }

    [Fact]
    public async Task CreateSkill_ReturnsCreatedAtAction()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        var mockSkillGrain = new Mock<ISkillGrain>();

        var skillRecord = new Skill(
            skillId,
            "First Aid",
            "Basic First Aid Certified"
        );

        _factory.MockClusterClient
            .Setup(c => c.GetGrain<ISkillGrain>(skillId, null))
            .Returns(mockSkillGrain.Object);

        var content = new StringContent(JsonSerializer.Serialize(skillRecord), Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync($"/api/skill", content);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        mockSkillGrain.Verify(g => g.UpdateDetails(It.Is<Skill>(s => s.SkillId == skillId)), Times.Once);
    }
}
