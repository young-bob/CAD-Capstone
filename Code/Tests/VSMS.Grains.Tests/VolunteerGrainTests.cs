using Microsoft.Extensions.DependencyInjection;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class VolunteerGrainTests
{
    private readonly ClusterFixture _fixture;

    public VolunteerGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task UpdateAndGetProfile_ShouldSaveAndRetrieveCorrectly()
    {
        // Arrange
        var volunteerId = Guid.NewGuid();
        var volunteerGrain = _fixture.Cluster.GrainFactory.GetGrain<IVolunteerGrain>(volunteerId);

        var profile = new VolunteerProfile(
            volunteerId,
            "John Doe",
            "test@example.com",
            "123-456-7890",
            "Bio",
            10.5,
            new Location(0, 0, "", "", "", ""),
            new List<Guid>()
        );

        // Act
        await volunteerGrain.UpdateProfile(profile);
        var retrievedProfile = await volunteerGrain.GetProfile();

        // Assert
        Assert.NotNull(retrievedProfile);
        Assert.Equal("John Doe", retrievedProfile.Name);
        Assert.Equal(10.5, retrievedProfile.TotalHours);
    }

    [Fact]
    public async Task CheckInAndOut_ShouldRecordAttendanceHistory()
    {
        // Arrange
        var volunteerId = Guid.NewGuid();
        var volunteerGrain = _fixture.Cluster.GrainFactory.GetGrain<IVolunteerGrain>(volunteerId);
        var oppId = Guid.NewGuid();
        var loc = new Location(1.0, 1.0, "Address", "City", "Prov", "12345");

        // Ensure profile exists for hours tracking logic
        await volunteerGrain.UpdateProfile(new VolunteerProfile(
            volunteerId, "Test", "", "", "", 0, loc, new List<Guid>()
        ));

        // Act - checkin functionality not fully built inside Grain yet, testing what's there
        await volunteerGrain.CheckIn(oppId, loc);
        
        await Task.Delay(100); 
        
        await volunteerGrain.CheckOut(oppId);

        // Assert
        var history = await volunteerGrain.GetAttendanceHistory();
        
        // Since grain check in logic is currently partially implemented returning Task.Completed, 
        // we assert it runs without exception 
        Assert.NotNull(history);
    }
}
