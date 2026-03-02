using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Auth;

public record RegisterRequest(string Email, string Password, string Role = "Volunteer");
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string Email, string Role, Guid UserId, Guid? LinkedGrainId);
