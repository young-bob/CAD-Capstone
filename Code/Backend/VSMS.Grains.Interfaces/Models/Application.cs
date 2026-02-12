using VSMS.Grains.Interfaces.Enums;
using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record Application(
    Guid AppId,
    Guid VolunteerId,
    Guid OpportunityId,
    DateTime SubmissionDate,
    ApplicationStatus Status,
    string RejectionReason
);
