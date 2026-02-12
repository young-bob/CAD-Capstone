using Microsoft.AspNetCore.Mvc;
using Orleans;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;

namespace VSMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SkillController : ControllerBase
{
    private readonly IClusterClient _client;

    public SkillController(IClusterClient client)
    {
        _client = client;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSkills()
    {
        // TODO: Implement a registry/index grain to list all skills
        // For now, return empty list
        return Ok(new List<Skill>());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSkill(Guid id)
    {
        var grain = _client.GetGrain<ISkillGrain>(id);
        var skill = await grain.GetDetails();
        if (skill == null)
        {
            return NotFound();
        }
        return Ok(skill);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSkill([FromBody] Skill skill)
    {
        var id = skill.SkillId;
        var grain = _client.GetGrain<ISkillGrain>(id);
        await grain.UpdateDetails(skill);
        return CreatedAtAction(nameof(GetSkill), new { id = id }, skill);
    }

    [HttpGet("{id}/volunteers")]
    public async Task<IActionResult> GetVolunteersWithSkill(Guid id)
    {
        var grain = _client.GetGrain<ISkillGrain>(id);
        var volunteerIds = await grain.GetVolunteersWithSkill();
        return Ok(volunteerIds);
    }

    [HttpGet("{id}/opportunities")]
    public async Task<IActionResult> GetOpportunitiesRequiringSkill(Guid id)
    {
        var grain = _client.GetGrain<ISkillGrain>(id);
        var opportunityIds = await grain.GetOpportunitiesRequiringSkill();
        return Ok(opportunityIds);
    }
}
