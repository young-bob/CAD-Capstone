using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Opportunities;

public record CancelRequest(string Reason);
public record AddShiftRequest(string Name, DateTime StartTime, DateTime EndTime, int MaxCapacity);
public record ApplyRequest(Guid VolunteerId, Guid ShiftId, string IdempotencyKey);
public record ValidateGeoRequest(double Lat, double Lon);
public record SetGeoFenceRequest(double Lat, double Lon, double RadiusMeters);
public record SetRequiredSkillsRequest(List<Guid> SkillIds);
public record UpdateInfoRequest(string Title, string Description, string Category, double Lat, double Lon, double RadiusMeters);
