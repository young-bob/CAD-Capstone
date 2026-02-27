namespace VSMS.VolunteerApp.Models;

public record ValidateAttendanceRequest(
    Guid VolunteerId,
    Guid OpportunityId
);
