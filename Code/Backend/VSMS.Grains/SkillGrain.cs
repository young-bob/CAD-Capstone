using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;

namespace VSMS.Grains;

public class SkillGrain : Grain, ISkillGrain
{
    private readonly IPersistentState<SkillState> _state;
    private readonly ILogger<SkillGrain> _logger;

    public SkillGrain(
        [PersistentState("skill", "grain-store")] IPersistentState<SkillState> state,
        ILogger<SkillGrain> logger)
    {
        _state = state;
        _logger = logger;
    }

    public async Task UpdateDetails(Skill skill)
    {
        try
        {
            _logger.LogInformation("Updating skill: {SkillId} - {Name}", skill.SkillId, skill.Name);
            _state.State.Details = skill;
            await _state.WriteStateAsync();
            _logger.LogInformation("Successfully updated skill: {SkillId}", skill.SkillId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update skill: {SkillId}. Error: {Message}", skill.SkillId, ex.Message);
            // Re-throw as a serializable exception
            throw new InvalidOperationException($"Failed to save skill {skill.SkillId}: {ex.Message}", ex);
        }
    }

    public Task<Skill?> GetDetails()
    {
        return Task.FromResult(_state.State.Details);
    }

    public Task<List<Guid>> GetVolunteersWithSkill()
    {
        return Task.FromResult(_state.State.VolunteerIds);
    }

    public Task<List<Guid>> GetOpportunitiesRequiringSkill()
    {
        return Task.FromResult(_state.State.OpportunityIds);
    }

    // Internal method to track volunteer-skill associations
    public async Task AddVolunteer(Guid volunteerId)
    {
        if (!_state.State.VolunteerIds.Contains(volunteerId))
        {
            _state.State.VolunteerIds.Add(volunteerId);
            await _state.WriteStateAsync();
        }
    }

    public async Task RemoveVolunteer(Guid volunteerId)
    {
        if (_state.State.VolunteerIds.Remove(volunteerId))
        {
            await _state.WriteStateAsync();
        }
    }

    public async Task AddOpportunity(Guid opportunityId)
    {
        if (!_state.State.OpportunityIds.Contains(opportunityId))
        {
            _state.State.OpportunityIds.Add(opportunityId);
            await _state.WriteStateAsync();
        }
    }
}

[GenerateSerializer]
public class SkillState
{
    [Id(0)]
    public Skill? Details { get; set; }

    [Id(1)]
    public List<Guid> VolunteerIds { get; set; } = new();

    [Id(2)]
    public List<Guid> OpportunityIds { get; set; } = new();
}
