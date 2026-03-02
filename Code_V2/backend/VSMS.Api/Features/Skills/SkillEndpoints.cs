using Microsoft.EntityFrameworkCore;
using VSMS.Abstractions.Enums;
using VSMS.Abstractions.Grains;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Data.EfCoreQuery.Entities;

namespace VSMS.Api.Features.Skills;

/// <summary>
/// Orleans-first skill endpoints.
/// SkillEntity = system catalogue (EF Core / read side).
/// Volunteer skills = grain state only (VolunteerGrain.SkillIds is source of truth).
/// </summary>
public static class SkillEndpoints
{
    public static void MapSkillEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/skills").WithTags("Skills");

        // ─── Skill catalogue (SystemAdmin manages) ───────────────────────────

        // List all skills — public, used in volunteer profile + opportunity creation UI
        group.MapGet("/", async (AppDbContext db) =>
            Results.Ok(await db.Skills
                .OrderBy(s => s.Category).ThenBy(s => s.Name)
                .Select(s => new { s.Id, s.Name, s.Category, s.Description })
                .ToListAsync()))
            .AllowAnonymous();

        // Create a skill definition (SystemAdmin only)
        group.MapPost("/", async (CreateSkillRequest req, AppDbContext db) =>
        {
            if (await db.Skills.AnyAsync(s => s.Name == req.Name))
                return Results.Conflict(new { Error = "Skill already exists." });
            var skill = new SkillEntity { Name = req.Name, Category = req.Category, Description = req.Description };
            db.Skills.Add(skill);
            await db.SaveChangesAsync();
            return Results.Created($"/api/skills/{skill.Id}", new { skill.Id, skill.Name, skill.Category });
        }).RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        // Delete a skill
        group.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var skill = await db.Skills.FindAsync(id);
            if (skill is null) return Results.NotFound();
            db.Skills.Remove(skill);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("SystemAdmin"));

        // ─── Volunteer skill management (Orleans-first) ──────────────────────
        // Skills owned by VolunteerGrain — EF Core is NOT involved in volunteer skill storage.

        // Add a skill to a volunteer (grain is write target)
        app.MapPost("/api/volunteers/{userId:guid}/skills/{skillId:guid}",
            async (Guid userId, Guid skillId, AppDbContext db, IGrainFactory grains) =>
            {
                var volunteer = await db.Volunteers.FindAsync(userId);
                if (volunteer is null) return Results.NotFound(new { Error = "Volunteer not found." });

                if (!await db.Skills.AnyAsync(s => s.Id == skillId))
                    return Results.NotFound(new { Error = "Skill not found." });

                // Grain is the source of truth — write to grain only
                var grain = grains.GetGrain<IVolunteerGrain>(volunteer.GrainId);
                await grain.AddSkill(skillId);
                return Results.NoContent();
            }).RequireAuthorization().WithTags("Volunteers");

        // Remove a skill from a volunteer
        app.MapDelete("/api/volunteers/{userId:guid}/skills/{skillId:guid}",
            async (Guid userId, Guid skillId, AppDbContext db, IGrainFactory grains) =>
            {
                var volunteer = await db.Volunteers.FindAsync(userId);
                if (volunteer is null) return Results.NotFound(new { Error = "Volunteer not found." });

                var grain = grains.GetGrain<IVolunteerGrain>(volunteer.GrainId);
                await grain.RemoveSkill(skillId);
                return Results.NoContent();
            }).RequireAuthorization().WithTags("Volunteers");

        // List a volunteer's skills — read from grain, enrich names from SkillEntity catalogue
        app.MapGet("/api/volunteers/{userId:guid}/skills",
            async (Guid userId, AppDbContext db, IGrainFactory grains) =>
            {
                var volunteer = await db.Volunteers.FindAsync(userId);
                if (volunteer is null) return Results.NotFound(new { Error = "Volunteer not found." });

                var grain = grains.GetGrain<IVolunteerGrain>(volunteer.GrainId);
                var skillIds = await grain.GetSkillIds();

                // Enrich with names from the catalogue
                var skills = await db.Skills
                    .Where(s => skillIds.Contains(s.Id))
                    .Select(s => new { s.Id, s.Name, s.Category })
                    .ToListAsync();

                return Results.Ok(skills);
            }).RequireAuthorization().WithTags("Volunteers");

        // ─── Opportunity required skills ─────────────────────────────────────

        // Set required skills on an opportunity (grain is write target)
        app.MapPut("/api/opportunities/{id:guid}/required-skills",
            async (Guid id, SetRequiredSkillsRequest req, IGrainFactory grains) =>
            {
                var grain = grains.GetGrain<IOpportunityGrain>(id);
                await grain.SetRequiredSkills(req.SkillIds);
                return Results.NoContent();
            }).RequireAuthorization().WithTags("Opportunities");

        // ─── Skill-based opportunity matching ────────────────────────────────

        // Returns published opportunities matched to a volunteer's skill profile.
        // Volunteer's skills come from VolunteerGrain.
        // Opportunity skill requirements come from OpportunityGrain.
        // Published opportunities are listed from the EF Core read model.
        app.MapGet("/api/opportunities/match",
            async (Guid volunteerId, AppDbContext db, IGrainFactory grains) =>
            {
                var volunteer = await db.Volunteers.FindAsync(volunteerId);
                if (volunteer is null) return Results.NotFound(new { Error = "Volunteer not found." });

                // 1. Get volunteer's skills from grain (one grain activation)
                var grain = grains.GetGrain<IVolunteerGrain>(volunteer.GrainId);
                var volunteerSkillIds = await grain.GetSkillIds();

                // 2. All published opportunities from read model (zero grain activations)
                var opportunities = await db.OpportunityReadModels
                    .Where(o => o.Status == OpportunityStatus.Published && o.AvailableSpots > 0)
                    .ToListAsync();

                // 3. Filter: open to everyone (no required skills) OR at least 1 skill overlaps
                var matched = opportunities
                    .Where(o => !o.RequiredSkillIds.Any()
                             || o.RequiredSkillIds.Any(id => volunteerSkillIds.Contains(id)))
                    .Select(o => new
                    {
                        Id = o.OpportunityId,
                        o.Title,
                        o.Category,
                        o.AvailableSpots,
                        RequiredSkillIds = o.RequiredSkillIds,
                        MatchedSkillCount = o.RequiredSkillIds.Count(id => volunteerSkillIds.Contains(id))
                    })
                    .OrderByDescending(o => o.MatchedSkillCount) // best match first
                    .ToList();

                return Results.Ok(new { VolunteerSkillIds = volunteerSkillIds, Opportunities = matched });
            }).RequireAuthorization().WithTags("Opportunities");
    }
}

public record CreateSkillRequest(string Name, string Category, string Description);
public record SetRequiredSkillsRequest(List<Guid> SkillIds);
