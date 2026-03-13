using VSMS.Abstractions.Grains;

namespace VSMS.Api.Features.Admin;

public record RejectOrgRequest(string Reason);
public record ResolveDisputeRequest(string Resolution, double AdjustedHours);
public record ResetPasswordRequest(string NewPassword);
public record ReassignCoordinatorRequest(Guid CoordinatorUserId);
