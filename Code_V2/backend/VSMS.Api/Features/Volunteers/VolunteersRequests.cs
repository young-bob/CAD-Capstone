using VSMS.Abstractions.Grains;

namespace VSMS.Api.Features.Volunteers;

public record UpdateProfileRequest(string FirstName, string LastName, string Email, string Phone, string Bio);
public record UploadCredentialRequest(string CredentialUrl);
public record FeedbackRequest(Guid OpportunityId, int Rating, string Comment);
public record PrivacySettingsRequest(bool IsProfilePublic, bool AllowEmail, bool AllowPush);
public record RegisterPushTokenRequest(string Token);
public record SetBackgroundCheckRequest(string Status);
