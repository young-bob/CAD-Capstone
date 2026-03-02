using Orleans;
using VSMS.Abstractions.Enums;

namespace VSMS.Abstractions.States;

[GenerateSerializer]
public sealed class ApplicationState
{
    [Id(0)] public Guid VolunteerId { get; set; }
    [Id(1)] public Guid OpportunityId { get; set; }
    [Id(2)] public Guid ShiftId { get; set; }
    [Id(3)] public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    [Id(4)] public string IdempotencyKey { get; set; } = string.Empty;
    [Id(5)] public DateTime? ExpirationTime { get; set; }
    [Id(6)] public Dictionary<string, string> QuestionAnswers { get; set; } = new();
    [Id(7)] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
