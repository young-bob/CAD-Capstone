using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.Interfaces;

public interface IUserGrain : IGrainWithGuidKey
{
    // Authentication
    Task<bool> ValidatePassword(string password);
    Task<bool> ResetPassword(string oldPassword, string newPassword);

    // User Management
    Task CreateUser(User user);
    Task<User?> GetProfile();
    Task UpdateEmail(string newEmail);
    Task UpdateLastLogin();
    Task DeactivateAccount();

    // Role Management
    Task<string?> GetRole();
    Task<string?> GetEmail();
}
