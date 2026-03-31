using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Attendance;

public record InitAttendanceRequest(Guid VolunteerId, Guid ApplicationId, Guid OpportunityId, Guid? ShiftId = null);
public record CheckInRequest(double Lat, double Lon, string ProofPhotoUrl);
public record QrCheckInRequest(string QrToken);
public record IssueQrCheckInTokenRequest(Guid OpportunityId, Guid ShiftId);
public record DisputeRequest(string Reason, string EvidenceUrl);
public record ConfirmRequest(Guid SupervisorId, int Rating);
public record ManualAdjustRequest(Guid CoordinatorId, DateTime NewCheckIn, DateTime NewCheckOut, string Reason);
public record ResolveDisputeRequest(Guid ResolverId, string Resolution, double AdjustedHours);
public record MarkUnderReviewRequest(Guid CoordinatorId);
