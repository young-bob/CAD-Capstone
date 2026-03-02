using Orleans;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class CoordinatorState
{
    [Id(0)] public string FirstName { get; set; } = string.Empty;
    [Id(1)] public string LastName { get; set; } = string.Empty;
    [Id(2)] public string Email { get; set; } = string.Empty;
    [Id(3)] public string Phone { get; set; } = string.Empty;

    /// <summary>The organization this coordinator manages.</summary>
    [Id(4)] public Guid? OrganizationId { get; set; }

    [Id(5)] public bool IsInitialized { get; set; }

    /// <summary>Expo push notification token.</summary>
    [Id(6)] public string? ExpoPushToken { get; set; }

    /// <summary>Total opportunities managed.</summary>
    [Id(7)] public int ManagedOpportunities { get; set; }
}
