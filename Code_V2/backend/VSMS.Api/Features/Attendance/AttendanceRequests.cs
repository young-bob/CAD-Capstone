using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Attendance;

public record InitAttendanceRequest(Guid VolunteerId, Guid ApplicationId, Guid OpportunityId);
public record CheckInRequest(double Lat, double Lon, string ProofPhotoUrl);
public record DisputeRequest(string Reason, string EvidenceUrl);
public record ConfirmRequest(Guid SupervisorId, int Rating);
public record ManualAdjustRequest(Guid CoordinatorId, DateTime NewCheckIn, DateTime NewCheckOut, string Reason);
