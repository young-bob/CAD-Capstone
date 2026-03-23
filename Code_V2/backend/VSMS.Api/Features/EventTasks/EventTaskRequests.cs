namespace VSMS.Api.Features.EventTasks;

public record CreateEventTaskRequest(
    string Title,
    string? Note,
    Guid? AssignedToGrainId,
    string? AssignedToEmail,
    string? AssignedToName,
    Guid CreatedByGrainId,
    string? CreatedByEmail);
