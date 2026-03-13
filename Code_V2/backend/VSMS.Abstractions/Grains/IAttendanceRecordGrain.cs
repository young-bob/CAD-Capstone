using Orleans;

namespace VSMS.Abstractions.Grains;

public interface IAttendanceRecordGrain : IGrainWithGuidKey
{
    Task Initialize(Guid volunteerId, Guid applicationId, Guid opportunityId);
    Task CheckIn(double lat, double lon, string proofPhotoUrl);
    Task WebCheckIn();
    Task CheckOut(DateTime? timeOut = null);
    Task ManualAdjustment(Guid coordinatorId, DateTime newCheckIn, DateTime newCheckOut, string reason);
    Task RaiseDispute(string reason, string evidenceUrl);
    Task ResolveDispute(Guid resolverId, string resolution, double adjustedHours);
    Task Confirm(Guid supervisorId, int rating);

    Task<States.AttendanceRecordState> GetState();
}
