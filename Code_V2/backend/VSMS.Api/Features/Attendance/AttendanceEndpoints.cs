using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Api.Features.Auth;
using VSMS.Api.Extensions;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Attendance;

public static class AttendanceEndpoints
{
    private const string QrTokenPurpose = "attendance_qr_checkin";

    public static void MapAttendanceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance").RequireAuthorization();

        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            var canView = http.IsSystemAdmin()
                || http.IsSelfByGrainId(state.VolunteerId)
                || await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
            if (!canView) return Results.Forbid();
            return Results.Ok(state);
        });

        group.MapGet("/opportunity/{opportunityId:guid}", async (Guid opportunityId, int? skip, int? take, HttpContext http, AppDbContext db, IAttendanceQueryService queryService, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, opportunityId, grains))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByOpportunityAsync(opportunityId, null, skip ?? 0, take ?? 500));
        });

        group.MapGet("/volunteer/{volunteerId:guid}", async (Guid volunteerId, int? skip, int? take, HttpContext http, IAttendanceQueryService queryService) =>
        {
            if (!http.IsSystemAdmin() && !http.IsSelfByGrainId(volunteerId))
                return Results.Forbid();
            return Results.Ok(await queryService.GetByVolunteerAsync(volunteerId, null, skip ?? 0, take ?? 500));
        });

        group.MapGet("/disputes/pending", async (int? skip, int? take, IAttendanceQueryService queryService) =>
            Results.Ok(await queryService.GetPendingDisputesAsync(skip ?? 0, take ?? 500)))
            .RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        group.MapPost("/{id:guid}/init", async (Guid id, InitAttendanceRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            if (!await http.CanManageOpportunityAsync(db, req.OpportunityId, grains))
                return Results.Forbid();
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            await grain.Initialize(req.VolunteerId, req.ApplicationId, req.OpportunityId, req.ShiftId);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/checkin", async (Guid id, CheckInRequest req, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.CheckIn(req.Lat, req.Lon, req.ProofPhotoUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/qr-checkin", async (Guid id, QrCheckInRequest req, HttpContext http, IGrainFactory grains, JwtSettings jwt) =>
        {
            if (string.IsNullOrWhiteSpace(req.QrToken))
                return Results.BadRequest(new { error = "qrToken is required." });

            if (!TryValidateQrToken(req.QrToken, jwt, out var principal, out var validationError))
                return Results.BadRequest(new { error = validationError ?? "Invalid QR token." });

            if (!TryReadGuidClaim(principal!, "opportunityId", out var tokenOpportunityId) ||
                !TryReadGuidClaim(principal!, "shiftId", out var tokenShiftId) ||
                !string.Equals(principal!.FindFirst("purpose")?.Value, QrTokenPurpose, StringComparison.Ordinal))
                return Results.BadRequest(new { error = "QR token claims are invalid." });

            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();

            var appState = await grains.GetGrain<IApplicationGrain>(state.ApplicationId).GetState();
            if (state.OpportunityId != tokenOpportunityId || appState.ShiftId != tokenShiftId)
                return Results.BadRequest(new { error = "This QR code does not match your assigned shift." });

            await grain.QrCheckIn();
            return Results.NoContent();
        });

        group.MapPost("/qr/issue", async (IssueQrCheckInTokenRequest req, HttpContext http, AppDbContext db, IGrainFactory grains, JwtSettings jwt) =>
        {
            if (!await http.CanManageOpportunityAsync(db, req.OpportunityId, grains))
                return Results.Forbid();

            var opp = await grains.GetGrain<IOpportunityGrain>(req.OpportunityId).GetState();
            var shift = opp.Shifts.FirstOrDefault(s => s.ShiftId == req.ShiftId);
            if (shift is null)
                return Results.BadRequest(new { error = "Shift not found for this opportunity." });

            var openAt = shift.StartTime.AddMinutes(-30);
            var closeAt = shift.EndTime.AddMinutes(30);
            var expiresAt = closeAt > DateTime.UtcNow ? closeAt : DateTime.UtcNow.AddMinutes(5);
            var now = DateTime.UtcNow;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("purpose", QrTokenPurpose),
                new Claim("opportunityId", req.OpportunityId.ToString()),
                new Claim("shiftId", req.ShiftId.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            };

            var tokenDescriptor = new JwtSecurityToken(
                issuer: jwt.Issuer,
                audience: jwt.Audience,
                claims: claims,
                notBefore: openAt,
                expires: expiresAt,
                signingCredentials: creds);

            var token = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
            var qrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data={Uri.EscapeDataString(token)}";

            return Results.Ok(new
            {
                token,
                qrImageUrl,
                opportunityId = req.OpportunityId,
                shiftId = req.ShiftId,
                shiftName = shift.Name,
                window = new
                {
                    openAtUtc = openAt,
                    closeAtUtc = closeAt
                },
                generatedAtUtc = now,
                expiresAtUtc = expiresAt
            });
        });

        group.MapPost("/{id:guid}/checkout", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            var canAct = http.IsSelfByGrainId(state.VolunteerId)
                || await http.CanManageOpportunityAsync(db, state.OpportunityId, grains);
            if (!canAct) return Results.Forbid();
            await grain.CheckOut();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/coordinator-checkin", async (Guid id, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.CoordinatorCheckIn();
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/dispute", async (Guid id, DisputeRequest req, HttpContext http, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!http.IsSelfByGrainId(state.VolunteerId))
                return Results.Forbid();
            await grain.RaiseDispute(req.Reason, req.EvidenceUrl);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/confirm", async (Guid id, ConfirmRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.Confirm(req.SupervisorId, req.Rating);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/adjust", async (Guid id, ManualAdjustRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.ManualAdjustment(req.CoordinatorId, req.NewCheckIn, req.NewCheckOut, req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/resolve", async (Guid id, ResolveDisputeRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.ResolveDispute(req.ResolverId, req.Resolution, req.AdjustedHours);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/review", async (Guid id, MarkUnderReviewRequest req, HttpContext http, AppDbContext db, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAttendanceRecordGrain>(id);
            var state = await grain.GetState();
            if (!await http.CanManageOpportunityAsync(db, state.OpportunityId, grains))
                return Results.Forbid();
            await grain.MarkDisputeUnderReview(req.CoordinatorId);
            return Results.NoContent();
        });
    }

    private static bool TryValidateQrToken(string token, JwtSettings jwt, out ClaimsPrincipal? principal, out string? error)
    {
        principal = null;
        error = null;

        var validation = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        try
        {
            principal = new JwtSecurityTokenHandler().ValidateToken(token.Trim(), validation, out _);
            return true;
        }
        catch (SecurityTokenExpiredException)
        {
            error = "QR code has expired.";
            return false;
        }
        catch (Exception)
        {
            error = "QR code is invalid.";
            return false;
        }
    }

    private static bool TryReadGuidClaim(ClaimsPrincipal principal, string claimType, out Guid value)
    {
        value = Guid.Empty;
        var raw = principal.FindFirst(claimType)?.Value;
        return !string.IsNullOrWhiteSpace(raw) && Guid.TryParse(raw, out value);
    }
}
