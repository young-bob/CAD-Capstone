using BCrypt.Net;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using VSMS.Grains.States;
using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class UserGrain : Grain, IUserGrain
{
    private readonly IPersistentState<UserState> _state;
    private readonly ILogger<UserGrain> _logger;

    public UserGrain(
        [PersistentState("user", "grain-store")] IPersistentState<UserState> state,
        ILogger<UserGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public async Task CreateUser(User user)
    {
        if (_state.State.User != null)
        {
            _logger.LogWarning("Attempted to create user that already exists: {UserId}", this.GetPrimaryKey());
            throw new InvalidOperationException("User already exists");
        }

        _state.State.User = user;
        await _state.WriteStateAsync();
        _logger.LogInformation("Created user: {UserId} with role {Role}", user.UserId, user.Role);
    }

    public async Task<bool> ValidatePassword(string password)
    {
        if (_state.State.User == null)
        {
            _logger.LogWarning("ValidatePassword called on non-existent user");
            return false;
        }

        try
        {
            bool isValid = BCrypt.Net.BCrypt.Verify(password, _state.State.User.PasswordHash);
            _logger.LogInformation("Password validation for user {UserId}: {Result}",
                this.GetPrimaryKey(), isValid ? "Success" : "Failed");
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating password for user {UserId}", this.GetPrimaryKey());
            return false;
        }
    }

    public async Task<bool> ResetPassword(string oldPassword, string newPassword)
    {
        if (_state.State.User == null)
            return false;

        if (!BCrypt.Net.BCrypt.Verify(oldPassword, _state.State.User.PasswordHash))
        {
            _logger.LogWarning("Failed password reset attempt for user {UserId} - invalid old password",
                this.GetPrimaryKey());
            return false;
        }

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(newPassword);
        _state.State.User = _state.State.User with { PasswordHash = hashedPassword };
        await _state.WriteStateAsync();

        _logger.LogInformation("Password reset successful for user {UserId}", this.GetPrimaryKey());
        return true;
    }

    public Task<User?> GetProfile()
    {
        return Task.FromResult(_state.State.User);
    }

    public async Task UpdateEmail(string newEmail)
    {
        if (_state.State.User == null)
            throw new InvalidOperationException("User does not exist");

        _state.State.User = _state.State.User with { Email = newEmail };
        await _state.WriteStateAsync();
        _logger.LogInformation("Updated email for user {UserId}", this.GetPrimaryKey());
    }

    public async Task UpdateLastLogin()
    {
        if (_state.State.User == null)
            return;

        _state.State.User = _state.State.User with { LastLoginAt = DateTime.UtcNow };
        await _state.WriteStateAsync();
    }

    public async Task DeactivateAccount()
    {
        if (_state.State.User == null)
            return;

        _state.State.User = _state.State.User with { IsActive = false };
        await _state.WriteStateAsync();
        _logger.LogInformation("Deactivated account for user {UserId}", this.GetPrimaryKey());
    }

    public Task<string?> GetRole()
    {
        return Task.FromResult(_state.State.User?.Role);
    }

    public Task<string?> GetEmail()
    {
        return Task.FromResult(_state.State.User?.Email);
    }
}
