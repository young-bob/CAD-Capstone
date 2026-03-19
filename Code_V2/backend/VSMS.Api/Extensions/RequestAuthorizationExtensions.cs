using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Extensions;

public static class RequestAuthorizationExtensions
{
    public static bool TryGetUserId(this HttpContext context, out Guid userId)
    {
        var value = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value;
        return Guid.TryParse(value, out userId);
    }

    public static bool TryGetGrainId(this HttpContext context, out Guid grainId)
    {
        var value = context.User.FindFirst("GrainId")?.Value;
        return Guid.TryParse(value, out grainId);
    }

    public static bool IsSystemAdmin(this HttpContext context) => context.User.IsInRole("SystemAdmin");
    public static bool IsCoordinator(this HttpContext context) => context.User.IsInRole("Coordinator");
    public static bool IsVolunteer(this HttpContext context) => context.User.IsInRole("Volunteer");

    public static bool IsSelfByUserId(this HttpContext context, Guid userId) =>
        context.TryGetUserId(out var callerUserId) && callerUserId == userId;

    public static bool IsSelfByGrainId(this HttpContext context, Guid grainId) =>
        context.TryGetGrainId(out var callerGrainId) && callerGrainId == grainId;

    public static async Task<bool> IsCoordinatorOfOrganizationAsync(this HttpContext context, AppDbContext db, Guid organizationId)
    {
        if (!context.IsCoordinator()) return false;
        if (!context.TryGetUserId(out var callerUserId)) return false;

        return await db.Coordinators
            .AsNoTracking()
            .AnyAsync(c => c.UserId == callerUserId && c.OrganizationId == organizationId);
    }

    public static async Task<bool> CanManageOrganizationAsync(this HttpContext context, AppDbContext db, Guid organizationId)
    {
        if (context.IsSystemAdmin()) return true;
        return await context.IsCoordinatorOfOrganizationAsync(db, organizationId);
    }

    public static async Task<bool> CanManageOpportunityAsync(this HttpContext context, AppDbContext db, Guid opportunityId)
    {
        if (context.IsSystemAdmin()) return true;
        if (!context.IsCoordinator()) return false;
        if (!context.TryGetUserId(out var callerUserId)) return false;

        var orgId = await db.OpportunityReadModels
            .AsNoTracking()
            .Where(o => o.OpportunityId == opportunityId)
            .Select(o => (Guid?)o.OrganizationId)
            .FirstOrDefaultAsync();

        if (!orgId.HasValue) return false;

        return await db.Coordinators
            .AsNoTracking()
            .AnyAsync(c => c.UserId == callerUserId && c.OrganizationId == orgId.Value);
    }
}

