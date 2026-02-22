using Microsoft.Extensions.DependencyInjection;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[CollectionDefinition(ClusterCollection.Name)]
public class ClusterCollection : ICollectionFixture<ClusterFixture>
{
    public const string Name = "ClusterCollection";
}

[Collection(ClusterCollection.Name)]
public class UserGrainTests
{
    private readonly ClusterFixture _fixture;

    public UserGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateUser_WithValidData_ShouldSucceed()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var userGrain = _fixture.Cluster.GrainFactory.GetGrain<IUserGrain>(userId);
        
        var newUser = new User(
            userId,
            "test@example.com",
            "hashedpassword_123",
            "Volunteer",
            DateTime.UtcNow,
            null,
            true
        );

        // Act
        await userGrain.CreateUser(newUser);

        // Assert - Verify state persistence
        var user = await userGrain.GetProfile();
        Assert.NotNull(user);
        Assert.Equal(newUser.Email, user.Email);
        Assert.Equal(newUser.Role, user.Role);
    }

    [Fact]
    public async Task ValidatePassword_WithCorrectPassword_ShouldReturnTrue()
    {
        var userId = Guid.NewGuid();
        var userGrain = _fixture.Cluster.GrainFactory.GetGrain<IUserGrain>(userId);

        var plainTextPassword = "correct_password";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(plainTextPassword);

        var newUser = new User(
            userId,
            "validateuser@example.com",
            passwordHash,
            "Volunteer",
            DateTime.UtcNow,
            null,
            true
        );
        await userGrain.CreateUser(newUser);

        // Act - the grain will check the provided plaintext against the BCrypt hash
        var isValid = await userGrain.ValidatePassword(plainTextPassword);

        // Assert
        Assert.True(isValid);
    }
    
    [Fact]
    public async Task ValidatePassword_WithIncorrectPassword_ShouldReturnFalse()
    {
        var userId = Guid.NewGuid();
        var userGrain = _fixture.Cluster.GrainFactory.GetGrain<IUserGrain>(userId);

        var plainTextPassword = "correct_password";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(plainTextPassword);

        var newUser = new User(
            userId,
            "validateuser_wrong@example.com",
            passwordHash,
            "Volunteer",
            DateTime.UtcNow,
            null,
            true
        );
        await userGrain.CreateUser(newUser);

        // Act
        var isValid = await userGrain.ValidatePassword("incorrect_password");

        // Assert
        Assert.False(isValid);
    }
}
