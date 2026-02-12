using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record Skill(
    Guid SkillId,
    string Name,
    string Description
);
