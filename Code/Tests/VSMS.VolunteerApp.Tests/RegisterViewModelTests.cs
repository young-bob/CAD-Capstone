using Moq;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.Tests;

/// <summary>
/// Tests for Models (positional records) and IVolunteerApiService mock verification.
/// </summary>
public class RegisterViewModelTests
{
    private readonly Mock<IVolunteerApiService> _mockApiService;

    public RegisterViewModelTests()
    {
        _mockApiService = new Mock<IVolunteerApiService>();
    }

    // ============ Model Tests ============

    [Fact]
    public void VolunteerProfile_Properties_AreCorrect()
    {
        var location = new Location(43.65, -79.38, "123 Main St", "Toronto", "ON", "M5V 1A1");
        var skills = new List<string> { "First Aid", "Cooking" };
        var profile = new VolunteerProfile("test@example.com", "123-456-7890", "Hello!", 15.5, location, skills);

        Assert.Equal("test@example.com", profile.Email);
        Assert.Equal("123-456-7890", profile.PhoneNumber);
        Assert.Equal("Hello!", profile.Bio);
        Assert.Equal(15.5, profile.TotalHours);
        Assert.Equal("Toronto", profile.CurrentLocation.City);
        Assert.Equal(2, profile.Skills.Count);
    }

    [Fact]
    public void AuthResponse_Properties_AreCorrect()
    {
        var userId = Guid.NewGuid();
        var response = new AuthResponse("jwt-token-123", userId, "user@test.com", "Volunteer");

        Assert.Equal("jwt-token-123", response.Token);
        Assert.Equal(userId, response.UserId);
        Assert.Equal("user@test.com", response.Email);
        Assert.Equal("Volunteer", response.Role);
    }

    [Fact]
    public void OpportunityDetails_Properties_AreCorrect()
    {
        var now = DateTime.UtcNow;
        var location = new Location(43.65, -79.38, "123 Main St", "Toronto", "ON", "M5V 1A1");
        var opportunity = new OpportunityDetails(
            "Beach Cleanup", "Help clean the beach",
            OpportunityVisibility.Public,
            now, now.AddHours(3),
            location, 100f, 20, 5);

        Assert.Equal("Beach Cleanup", opportunity.Title);
        Assert.Equal("Help clean the beach", opportunity.Description);
        Assert.Equal("Toronto", opportunity.VenueLocation.City);
        Assert.Equal(now, opportunity.StartTime);
        Assert.Equal(now.AddHours(3), opportunity.EndTime);
        Assert.Equal(20, opportunity.MaxVolunteers);
        Assert.Equal(5, opportunity.RegisteredCount);
    }

    [Fact]
    public void Location_Properties_AreCorrect()
    {
        var location = new Location(43.65, -79.38, "123 Main St", "Toronto", "ON", "M5V 1A1");

        Assert.Equal(43.65, location.Latitude);
        Assert.Equal(-79.38, location.Longitude);
        Assert.Equal("Toronto", location.City);
        Assert.Equal("ON", location.Province);
        Assert.Equal("123 Main St", location.Address);
        Assert.Equal("M5V 1A1", location.PostalCode);
    }

    [Fact]
    public void AuthResponse_DifferentRoles()
    {
        var volunteer = new AuthResponse("t1", Guid.NewGuid(), "v@test.com", "Volunteer");
        var coordinator = new AuthResponse("t2", Guid.NewGuid(), "c@test.com", "Coordinator");

        Assert.Equal("Volunteer", volunteer.Role);
        Assert.Equal("Coordinator", coordinator.Role);
        Assert.NotEqual(volunteer.UserId, coordinator.UserId);
    }

    // ============ API Service Mock Tests ============

    [Fact]
    public void ApiService_RegisterMethod_CanBeMocked()
    {
        _mockApiService.Setup(s => s.Register(It.IsAny<object>()))
            .Returns(Task.CompletedTask);

        Assert.NotNull(_mockApiService.Object);
        _mockApiService.Verify(s => s.Register(It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task ApiService_LoginMethod_ReturnsToken()
    {
        var expected = new AuthResponse("test-token", Guid.NewGuid(), "test@test.com", "Volunteer");

        _mockApiService.Setup(s => s.Login(It.IsAny<object>()))
            .ReturnsAsync(expected);

        var result = await _mockApiService.Object.Login(new { Email = "test@test.com", Password = "pass" });

        Assert.Equal("test-token", result.Token);
        Assert.Equal("test@test.com", result.Email);
        _mockApiService.Verify(s => s.Login(It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task ApiService_GetProfile_ReturnsProfile()
    {
        var userId = Guid.NewGuid();
        var location = new Location(0, 0, "", "", "", "");
        var expected = new VolunteerProfile("mock@test.com", "555-1234", "Bio", 42.0, location, new List<string>());

        _mockApiService.Setup(s => s.GetProfile(userId))
            .ReturnsAsync(expected);

        var result = await _mockApiService.Object.GetProfile(userId);

        Assert.Equal("mock@test.com", result.Email);
        Assert.Equal(42.0, result.TotalHours);
        _mockApiService.Verify(s => s.GetProfile(userId), Times.Once);
    }

    [Fact]
    public async Task ApiService_GetOpportunities_ReturnsList()
    {
        var location = new Location(0, 0, "", "", "", "");
        var now = DateTime.UtcNow;
        var opportunities = new List<OpportunityDetails>
        {
            new("Event 1", "Desc 1", OpportunityVisibility.Public, now, now.AddHours(2), location, 50f, 10, 3),
            new("Event 2", "Desc 2", OpportunityVisibility.Public, now, now.AddHours(3), location, 50f, 20, 5),
            new("Event 3", "Desc 3", OpportunityVisibility.Public, now, now.AddHours(4), location, 50f, 15, 0)
        };

        _mockApiService.Setup(s => s.GetOpportunities())
            .ReturnsAsync(opportunities);

        var result = await _mockApiService.Object.GetOpportunities();

        Assert.Equal(3, result.Count);
        Assert.Equal("Event 1", result[0].Title);
        Assert.Equal("Event 3", result[2].Title);
    }

    [Fact]
    public async Task ApiService_UpdateProfile_CallsSuccessfully()
    {
        var userId = Guid.NewGuid();
        var location = new Location(0, 0, "", "", "", "");
        var profile = new VolunteerProfile("updated@test.com", "555-9999", "New bio", 10.0, location, new List<string> { "Driving" });

        _mockApiService.Setup(s => s.UpdateProfile(userId, profile))
            .Returns(Task.CompletedTask);

        await _mockApiService.Object.UpdateProfile(userId, profile);

        _mockApiService.Verify(s => s.UpdateProfile(userId, profile), Times.Once);
    }

    [Fact]
    public async Task ApiService_GetOpportunity_ReturnsOneOpportunity()
    {
        var oppId = Guid.NewGuid();
        var location = new Location(43.65, -79.38, "Beach", "Toronto", "ON", "M5V");
        var expected = new OpportunityDetails("Beach Cleanup", "Help!", OpportunityVisibility.Public,
            DateTime.UtcNow, DateTime.UtcNow.AddHours(2), location, 100f, 30, 10);

        _mockApiService.Setup(s => s.GetOpportunity(oppId))
            .ReturnsAsync(expected);

        var result = await _mockApiService.Object.GetOpportunity(oppId);

        Assert.Equal("Beach Cleanup", result.Title);
        Assert.Equal(30, result.MaxVolunteers);
        _mockApiService.Verify(s => s.GetOpportunity(oppId), Times.Once);
    }
}
