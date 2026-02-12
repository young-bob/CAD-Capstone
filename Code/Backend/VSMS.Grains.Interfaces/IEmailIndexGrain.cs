using Orleans;

namespace VSMS.Grains.Interfaces;

/// <summary>
/// Index grain to map email addresses to user IDs for login lookup.
/// Grain key is the email address.
/// </summary>
public interface IEmailIndexGrain : IGrainWithStringKey
{
    Task RegisterEmail(Guid userId);
    Task<Guid?> GetUserIdByEmail();
    Task RemoveEmail();
}
