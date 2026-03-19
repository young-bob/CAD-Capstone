using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Orleans.Runtime;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure.Data.EfCoreQuery;

namespace VSMS.Api.Features.Admin;

public static class AdminEndpoints
{
    private sealed record MembershipSnapshot(
        string SiloKey,
        string? SiloName,
        string? HostName,
        DateTime? StartTimeUtc,
        DateTime? IAmAliveTimeUtc);

    private sealed record GrainActivationRow(
        string Silo,
        string GrainType,
        long Activations);

    private sealed record RuntimeStatsSnapshot(
        string Silo,
        double CpuUsage,
        long AvailableMemory,
        long MemoryUsage,
        long TotalPhysicalMemory,
        bool IsOverloaded,
        int ClientCount,
        long ReceivedMessages,
        long SentMessages,
        DateTime? SnapshotTimeUtc,
        long ActivationCount,
        long RecentlyUsedActivationCount);

    private static (int Skip, int Take) NormalizePaging(int skip, int take)
    {
        if (skip < 0) skip = 0;
        if (take <= 0) take = 500;
        if (take > 500) take = 500;
        return (skip, take);
    }

    private static string BuildSiloKey(string address, int port, int generation)
        => $"S{address}:{port}:{generation}";

    private static bool IsSystemGrain(string grainType)
        => grainType.StartsWith("Orleans.", StringComparison.OrdinalIgnoreCase);

    private static bool IsDeadSiloStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return false;
        return status.Contains("dead", StringComparison.OrdinalIgnoreCase);
    }

    private static double StdDev(IEnumerable<long> values)
    {
        var arr = values.Select(v => (double)v).ToArray();
        if (arr.Length == 0) return 0;
        var avg = arr.Average();
        var variance = arr.Select(v => (v - avg) * (v - avg)).Average();
        return Math.Sqrt(variance);
    }

    private static async Task<Dictionary<string, MembershipSnapshot>> TryReadMembershipSnapshotsAsync(AppDbContext db)
    {
        var map = new Dictionary<string, MembershipSnapshot>(StringComparer.OrdinalIgnoreCase);
        try
        {
            await using var conn = db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT Address, Port, Generation, SiloName, HostName, StartTime, IAmAliveTime
                FROM OrleansMembershipTable
            """;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var address = reader["Address"]?.ToString() ?? string.Empty;
                var port = Convert.ToInt32(reader["Port"]);
                var generation = Convert.ToInt32(reader["Generation"]);
                var siloKey = BuildSiloKey(address, port, generation);

                var start = reader["StartTime"] is DBNull ? (DateTime?)null : Convert.ToDateTime(reader["StartTime"]).ToUniversalTime();
                var alive = reader["IAmAliveTime"] is DBNull ? (DateTime?)null : Convert.ToDateTime(reader["IAmAliveTime"]).ToUniversalTime();

                map[siloKey] = new MembershipSnapshot(
                    siloKey,
                    reader["SiloName"]?.ToString(),
                    reader["HostName"]?.ToString(),
                    start,
                    alive);
            }
        }
        catch
        {
            // Best-effort enrichment only: if membership table is unavailable, runtime stats still return.
        }
        return map;
    }

    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin").WithTags("Admin")
            .RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        group.MapPost("/organizations/{orgId:guid}/approve", async (Guid orgId, IGrainFactory grains) =>
        {
            // Use a singleton admin grain for simplicity
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.ApproveOrganization(orgId);
            return Results.NoContent();
        });

        group.MapPost("/organizations/{orgId:guid}/reject", async (Guid orgId, RejectOrgRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.RejectOrganization(orgId, req.Reason);
            return Results.NoContent();
        });

        group.MapPost("/users/{userId:guid}/ban", async (Guid userId, HttpContext http, IGrainFactory grains) =>
        {
            var callerId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? http.User.FindFirst("sub")?.Value;
            if (callerId != null && Guid.TryParse(callerId, out var callerGuid) && callerGuid == userId)
                return Results.BadRequest(new { Error = "You cannot ban yourself." });

            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.BanUser(userId);
            return Results.NoContent();
        });

        group.MapPost("/users/{userId:guid}/unban", async (Guid userId, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.UnbanUser(userId);
            return Results.NoContent();
        });

        group.MapPost("/disputes/{attendanceId:guid}/resolve", async (Guid attendanceId, ResolveDisputeRequest req, IGrainFactory grains) =>
        {
            var grain = grains.GetGrain<IAdminGrain>(Guid.Empty);
            await grain.ResolveDispute(attendanceId, req.Resolution, req.AdjustedHours);
            return Results.NoContent();
        });

        // Runtime Orleans grain distribution (activations by silo/type)
        group.MapGet("/runtime/grain-distribution", async (IGrainFactory grains) =>
        {
            var management = grains.GetGrain<IManagementGrain>(0);
            var stats = await management.GetSimpleGrainStatistics();

            var rows = stats
                .Select(s => new
                {
                    Silo = s.SiloAddress?.ToString() ?? "unknown",
                    GrainType = s.GrainType?.ToString() ?? "unknown",
                    Activations = (long)s.ActivationCount
                })
                .ToList();

            var bySilo = rows
                .GroupBy(x => x.Silo)
                .Select(g => new
                {
                    silo = g.Key,
                    totalActivations = g.Sum(x => x.Activations),
                    grainTypes = g
                        .GroupBy(x => x.GrainType)
                        .Select(t => new
                        {
                            grainType = t.Key,
                            activations = t.Sum(x => x.Activations)
                        })
                        .OrderByDescending(x => x.activations)
                        .ToList()
                })
                .OrderByDescending(x => x.totalActivations)
                .ToList();

            return Results.Ok(new
            {
                generatedAtUtc = DateTime.UtcNow,
                totalSilos = bySilo.Count,
                totalActivations = rows.Sum(x => x.Activations),
                silos = bySilo
            });
        });

        // Runtime system information grouped by silo:
        // 1) Health summary (status/heartbeat/uptime/version)
        // 2) Load skew metrics
        // 4) System vs business grain ratio
        group.MapGet("/runtime/system-info", async (IGrainFactory grains, AppDbContext db) =>
        {
            var management = grains.GetGrain<IManagementGrain>(0);
            var hosts = await management.GetHosts(onlyActive: true);
            var stats = await management.GetSimpleGrainStatistics();
            var membership = await TryReadMembershipSnapshotsAsync(db);
            var version = typeof(AdminEndpoints).Assembly.GetName().Version?.ToString();

            var hostStatus = hosts.ToDictionary(
                x => x.Key.ToString(),
                x => x.Value.ToString(),
                StringComparer.OrdinalIgnoreCase);
            var hostAddresses = hosts.Keys.ToArray();

            var runtimeBySilo = new Dictionary<string, RuntimeStatsSnapshot>(StringComparer.OrdinalIgnoreCase);
            try
            {
                if (hostAddresses.Length > 0)
                {
                    await management.ForceRuntimeStatisticsCollection(hostAddresses);
                    var runtimeRows = await management.GetRuntimeStatistics(hostAddresses);
                    var runtimeList = runtimeRows.ToList();
                    var count = Math.Min(hostAddresses.Length, runtimeList.Count);
                    for (var i = 0; i < count; i++)
                    {
                        var snapshot = runtimeList[i];
                        var key = hostAddresses[i].ToString();
                        var sampledAt = snapshot.DateTime == default ? (DateTime?)null : snapshot.DateTime.ToUniversalTime();

                        runtimeBySilo[key] = new RuntimeStatsSnapshot(
                            key,
                            Math.Round(Convert.ToDouble(snapshot.CpuUsage), 4),
                            Convert.ToInt64(snapshot.AvailableMemory),
                            Convert.ToInt64(snapshot.MemoryUsage),
                            Convert.ToInt64(snapshot.TotalPhysicalMemory),
                            snapshot.IsOverloaded,
                            Convert.ToInt32(snapshot.ClientCount),
                            Convert.ToInt64(snapshot.ReceivedMessages),
                            Convert.ToInt64(snapshot.SentMessages),
                            sampledAt,
                            Convert.ToInt64(snapshot.ActivationCount),
                            Convert.ToInt64(snapshot.RecentlyUsedActivationCount));
                    }
                }
            }
            catch
            {
                // Runtime stats are best-effort only.
            }

            var grainRows = stats
                .Select(s => new GrainActivationRow(
                    s.SiloAddress?.ToString() ?? "unknown",
                    s.GrainType?.ToString() ?? "unknown",
                    (long)s.ActivationCount))
                .ToList();

            var grainBySilo = grainRows
                .GroupBy(x => x.Silo, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => g.GroupBy(x => x.GrainType, StringComparer.OrdinalIgnoreCase)
                        .Select(t => new GrainActivationRow(
                            g.Key,
                            t.Key,
                            t.Sum(v => v.Activations)))
                        .OrderByDescending(t => t.Activations)
                        .ToList(),
                    StringComparer.OrdinalIgnoreCase);

            var siloKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in hostStatus)
            {
                if (!IsDeadSiloStatus(pair.Value))
                {
                    siloKeys.Add(pair.Key);
                }
            }
            foreach (var key in grainBySilo.Keys) siloKeys.Add(key);

            var silos = siloKeys
                .Select(silo =>
                {
                    var grainsInSilo = grainBySilo.TryGetValue(silo, out var g) ? g : new List<GrainActivationRow>();
                    var total = grainsInSilo.Sum(x => x.Activations);
                    var system = grainsInSilo.Where(x => IsSystemGrain(x.GrainType)).Sum(x => x.Activations);
                    var business = total - system;

                    var status = hostStatus.TryGetValue(silo, out var st) ? st : "Unknown";
                    var isAlive = status.Equals("Active", StringComparison.OrdinalIgnoreCase);

                    membership.TryGetValue(silo, out var member);
                    var startTime = member?.StartTimeUtc;
                    var heartbeat = member?.IAmAliveTimeUtc;
                    runtimeBySilo.TryGetValue(silo, out var runtime);
                    int? uptimeMinutes = null;
                    if (startTime.HasValue)
                    {
                        uptimeMinutes = Math.Max(0, (int)Math.Floor((DateTime.UtcNow - startTime.Value).TotalMinutes));
                    }

                    var memoryUsageRatio =
                        runtime is null || runtime.TotalPhysicalMemory <= 0
                            ? (double?)null
                            : Math.Round((double)runtime.MemoryUsage / runtime.TotalPhysicalMemory, 4);

                    return new
                    {
                        silo,
                        status,
                        isAlive,
                        hostName = member?.HostName,
                        siloName = member?.SiloName,
                        version,
                        startTimeUtc = startTime,
                        lastHeartbeatUtc = heartbeat,
                        uptimeMinutes,
                        totalActivations = total,
                        systemActivations = system,
                        businessActivations = business,
                        systemRatio = total == 0 ? 0d : Math.Round((double)system / total, 4),
                        businessRatio = total == 0 ? 0d : Math.Round((double)business / total, 4),
                        runtime = runtime is null ? null : new
                        {
                            cpuUsage = runtime.CpuUsage,
                            availableMemoryBytes = runtime.AvailableMemory,
                            memoryUsageBytes = runtime.MemoryUsage,
                            totalPhysicalMemoryBytes = runtime.TotalPhysicalMemory,
                            memoryUsageRatio,
                            isOverloaded = runtime.IsOverloaded,
                            clientCount = runtime.ClientCount,
                            receivedMessages = runtime.ReceivedMessages,
                            sentMessages = runtime.SentMessages,
                            runtimeCollectedAtUtc = runtime.SnapshotTimeUtc,
                            activationCount = runtime.ActivationCount,
                            recentlyUsedActivationCount = runtime.RecentlyUsedActivationCount
                        },
                        grainTypes = grainsInSilo.Select(x => new
                        {
                            grainType = x.GrainType,
                            activations = x.Activations
                        }).ToList()
                    };
                })
                .Where(x => !IsDeadSiloStatus(x.status))
                .OrderByDescending(x => x.totalActivations)
                .ToList();

            var totals = silos.Select(x => (long)x.totalActivations).ToList();
            var max = totals.Count == 0 ? 0 : totals.Max();
            var min = totals.Count == 0 ? 0 : totals.Min();
            var avg = totals.Count == 0 ? 0d : totals.Average();
            var stdDev = StdDev(totals);
            var skewRatio = min > 0 ? Math.Round((double)max / min, 4) : (double?)null;
            var mostBusy = silos.FirstOrDefault(x => x.totalActivations == max)?.silo;
            var leastBusy = silos.FirstOrDefault(x => x.totalActivations == min)?.silo;

            var overallTotal = silos.Sum(x => (long)x.totalActivations);
            var overallSystem = silos.Sum(x => (long)x.systemActivations);
            var overallBusiness = silos.Sum(x => (long)x.businessActivations);
            var runtimeSamples = silos
                .Where(x => x.runtime is not null)
                .Select(x => x.runtime!)
                .ToList();
            var sampledSilos = runtimeSamples.Count;
            var overloadedSilos = runtimeSamples.Count(x => x.isOverloaded);
            var avgCpuUsage = sampledSilos == 0 ? (double?)null : Math.Round(runtimeSamples.Average(x => (double)x.cpuUsage), 2);
            var memoryRatios = runtimeSamples.Where(x => x.memoryUsageRatio is not null).Select(x => x.memoryUsageRatio!.Value).ToList();
            var avgMemoryUsageRatio = memoryRatios.Count == 0 ? (double?)null : Math.Round(memoryRatios.Average(), 4);
            var totalClients = runtimeSamples.Sum(x => (long)x.clientCount);
            var totalReceivedMessages = runtimeSamples.Sum(x => (long)x.receivedMessages);
            var totalSentMessages = runtimeSamples.Sum(x => (long)x.sentMessages);

            return Results.Ok(new
            {
                generatedAtUtc = DateTime.UtcNow,
                totalSilos = silos.Count,
                totalActivations = overallTotal,
                overallSystemActivations = overallSystem,
                overallBusinessActivations = overallBusiness,
                overallSystemRatio = overallTotal == 0 ? 0d : Math.Round((double)overallSystem / overallTotal, 4),
                overallBusinessRatio = overallTotal == 0 ? 0d : Math.Round((double)overallBusiness / overallTotal, 4),
                skew = new
                {
                    mostBusySilo = mostBusy,
                    leastBusySilo = leastBusy,
                    maxActivations = max,
                    minActivations = min,
                    avgActivations = Math.Round(avg, 2),
                    stdDevActivations = Math.Round(stdDev, 2),
                    skewRatio
                },
                runtimeOverview = new
                {
                    sampledSilos,
                    overloadedSilos,
                    avgCpuUsage,
                    avgMemoryUsageRatio,
                    totalClients,
                    totalReceivedMessages,
                    totalSentMessages
                },
                silos
            });
        });

        // List all users excluding SystemAdmin (with optional filter by role or email search)
        group.MapGet("/users", async (string? role, string? search, string? status, DateTime? dateFrom, DateTime? dateTo, string? sort, int? skip, int? take, AppDbContext db) =>
        {
            var (safeSkip, safeTake) = NormalizePaging(skip ?? 0, take ?? 500);
            var q = db.Users.AsNoTracking().Where(u => u.Role != "SystemAdmin").AsQueryable();
            if (!string.IsNullOrWhiteSpace(role))
                q = q.Where(u => u.Role == role);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(u => u.Email.Contains(search));
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (status.Equals("active", StringComparison.OrdinalIgnoreCase)) q = q.Where(u => !u.IsBanned);
                if (status.Equals("banned", StringComparison.OrdinalIgnoreCase)) q = q.Where(u => u.IsBanned);
            }
            if (dateFrom.HasValue)
                q = q.Where(u => u.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue)
                q = q.Where(u => u.CreatedAt <= dateTo.Value);

            q = sort?.ToLowerInvariant() switch
            {
                "oldest" => q.OrderBy(u => u.CreatedAt),
                "email_asc" => q.OrderBy(u => u.Email),
                "email_desc" => q.OrderByDescending(u => u.Email),
                _ => q.OrderByDescending(u => u.CreatedAt),
            };

            var users = await q
                .Skip(safeSkip)
                .Take(safeTake)
                .Select(u => new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt })
                .ToListAsync();

            // Enrich coordinators with org info from read-side tables
            var coordUserIds = users.Where(u => u.Role == "Coordinator").Select(u => u.Id).ToList();
            var coordOrgs = new Dictionary<Guid, (string OrgId, string OrgName)>();
            if (coordUserIds.Count > 0)
            {
                var entries = await db.Coordinators
                    .AsNoTracking()
                    .Where(c => coordUserIds.Contains(c.UserId) && c.OrganizationId != Guid.Empty)
                    .Join(db.OrganizationReadModels,
                        c => c.OrganizationId,
                        o => o.OrgId,
                        (c, o) => new { c.UserId, OrgId = o.OrgId.ToString(), OrgName = o.Name })
                    .ToListAsync();
                foreach (var e in entries)
                    coordOrgs[e.UserId] = (e.OrgId, e.OrgName);
            }

            var result = users.Select(u =>
            {
                if (u.Role == "Coordinator" && coordOrgs.TryGetValue(u.Id, out var org))
                    return (object)new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt, organizationId = (string?)org.OrgId, organizationName = (string?)org.OrgName };
                return (object)new { u.Id, u.Email, u.Role, u.IsBanned, u.CreatedAt, organizationId = (string?)null, organizationName = (string?)null };
            });

            return Results.Ok(result);
        });

        // Reassign primary coordinator for an organization (updates read-side DB only)
        group.MapPost("/organizations/{orgId:guid}/reassign-coordinator", async (Guid orgId, ReassignCoordinatorRequest req, AppDbContext db) =>
        {
            var newCoord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == req.CoordinatorUserId);
            if (newCoord is null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });

            // Clear existing primary coordinator for this org
            var oldCoords = await db.Coordinators.Where(c => c.OrganizationId == orgId).ToListAsync();
            foreach (var old in oldCoords)
                old.OrganizationId = Guid.Empty;

            // Assign new coordinator
            newCoord.OrganizationId = orgId;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Reset a user's password (cannot reset another SystemAdmin)
        group.MapPost("/users/{userId:guid}/reset-password", async (Guid userId, ResetPasswordRequest req, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
                return Results.BadRequest(new { Error = "Password must be at least 6 characters." });
            var user = await db.Users.FindAsync(userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot reset SystemAdmin password via this endpoint." });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Convenience: list pending organizations
        group.MapGet("/pending-organizations", async (int? skip, int? take, IOrganizationQueryService queryService) =>
            Results.Ok(await queryService.GetPendingOrganizationsAsync(skip ?? 0, take ?? 500)));

        // Delete a user (cannot delete SystemAdmin or self; requires email confirmation)
        group.MapDelete("/users/{userId:guid}", async (Guid userId, [FromBody] DeleteUserRequest req, HttpContext http, AppDbContext db) =>
        {
            var callerId = http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? http.User.FindFirst("sub")?.Value;
            if (callerId != null && Guid.TryParse(callerId, out var callerGuid) && callerGuid == userId)
                return Results.BadRequest(new { Error = "You cannot delete yourself." });

            var user = await db.Users
                .Include(u => u.VolunteerProfile)
                .Include(u => u.CoordinatorProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot delete a SystemAdmin." });
            if (!string.Equals(user.Email, req.ConfirmEmail, StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { Error = "Email confirmation does not match." });

            if (user.VolunteerProfile != null) db.Volunteers.Remove(user.VolunteerProfile);
            if (user.CoordinatorProfile != null) db.Coordinators.Remove(user.CoordinatorProfile);
            db.Users.Remove(user);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Change a user's role to Volunteer or Coordinator
        group.MapPost("/users/{userId:guid}/change-role", async (Guid userId, ChangeRoleRequest req, AppDbContext db) =>
        {
            if (req.NewRole != "Volunteer" && req.NewRole != "Coordinator")
                return Results.BadRequest(new { Error = "Role must be 'Volunteer' or 'Coordinator'." });

            var user = await db.Users
                .Include(u => u.VolunteerProfile)
                .Include(u => u.CoordinatorProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return Results.NotFound(new { Error = "User not found." });
            if (user.Role == "SystemAdmin") return Results.BadRequest(new { Error = "Cannot change SystemAdmin role." });
            if (user.Role == req.NewRole) return Results.NoContent();

            user.Role = req.NewRole;
            if (req.NewRole == "Coordinator" && user.CoordinatorProfile is null)
                db.Coordinators.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.CoordinatorEntity { UserId = userId, GrainId = Guid.NewGuid() });
            else if (req.NewRole == "Volunteer" && user.VolunteerProfile is null)
                db.Volunteers.Add(new VSMS.Infrastructure.Data.EfCoreQuery.Entities.VolunteerEntity { UserId = userId, GrainId = Guid.NewGuid() });

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Add a coordinator to an org directly (does not clear existing coordinator)
        group.MapPost("/organizations/{orgId:guid}/add-coordinator", async (Guid orgId, ReassignCoordinatorRequest req, AppDbContext db) =>
        {
            var coord = await db.Coordinators.FirstOrDefaultAsync(c => c.UserId == req.CoordinatorUserId);
            if (coord is null)
                return Results.BadRequest(new { Error = "Coordinator profile not found." });
            coord.OrganizationId = orgId;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

}
