using System;
using System.Threading.Tasks;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class SkillGrainTests
{
    private readonly ClusterFixture _fixture;

    public SkillGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task UpdateAndGetDetails_ShouldSaveAndRetrieveCorrectly()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        var skillGrain = _fixture.Cluster.GrainFactory.GetGrain<ISkillGrain>(skillId);

        var skillRecord = new Skill(
            skillId,
            "C# Programming",
            "Expertise in building .NET backend systems"
        );

        // Act
        await skillGrain.UpdateDetails(skillRecord);
        var retrieved = await skillGrain.GetDetails();

        // Assert
        Assert.NotNull(retrieved);
        Assert.Equal(skillRecord.Name, retrieved.Name);
        Assert.Equal(skillRecord.Description, retrieved.Description);
    }
    
    [Fact]
    public async Task AddAndRemoveVolunteer_ShouldUpdateSkillAssociationList()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        var skillGrain = _fixture.Cluster.GrainFactory.GetGrain<ISkillGrain>(skillId);
        var volunteerId1 = Guid.NewGuid();
        var volunteerId2 = Guid.NewGuid();
        
        // Act (Add)
        await skillGrain.AddVolunteer(volunteerId1);
        await skillGrain.AddVolunteer(volunteerId2);
        
        // Assert (Add)
        var volunteersWithSkill = await skillGrain.GetVolunteersWithSkill();
        Assert.Equal(2, volunteersWithSkill.Count);
        Assert.Contains(volunteerId1, volunteersWithSkill);

        // Act (Remove)
        await skillGrain.RemoveVolunteer(volunteerId1);
        
        // Assert (Remove)
        volunteersWithSkill = await skillGrain.GetVolunteersWithSkill();
        Assert.Single(volunteersWithSkill);
        Assert.Contains(volunteerId2, volunteersWithSkill);
        Assert.DoesNotContain(volunteerId1, volunteersWithSkill);
    }
    
    [Fact]
    public async Task AddOpportunity_ShouldTrackOpportunityRequiringSkill()
    {
        // Arrange
        var skillId = Guid.NewGuid();
        var skillGrain = _fixture.Cluster.GrainFactory.GetGrain<ISkillGrain>(skillId);
        var oppId = Guid.NewGuid();
        
        // Act
        await skillGrain.AddOpportunity(oppId);
        
        // Assert
        var opportunitiesWithSkill = await skillGrain.GetOpportunitiesRequiringSkill();
        Assert.Single(opportunitiesWithSkill);
        Assert.Contains(oppId, opportunitiesWithSkill);
    }
}
