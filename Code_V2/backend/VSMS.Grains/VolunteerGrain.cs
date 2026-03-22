using Microsoft.Extensions.Logging;
using Orleans;
using Orleans.Runtime;
using VSMS.Abstractions.Grains;
using VSMS.Abstractions.States;

namespace VSMS.Grains;

public class VolunteerGrain(
    [PersistentState("volunteer", "vsms")] IPersistentState<VolunteerState> state,
    ILogger<VolunteerGrain> logger) : Grain, IVolunteerGrain
{
    public Task<VolunteerState> GetProfile() => Task.FromResult(state.State);

    public async Task UpdateProfile(string firstName, string lastName, string email, string phone, string bio)
    {
        state.State.FirstName = firstName;
        state.State.LastName = lastName;
        state.State.Email = email;
        state.State.Phone = phone;
        state.State.Bio = bio;
        state.State.IsInitialized = true;
        await state.WriteStateAsync();
        logger.LogInformation("Volunteer {Id} profile updated", this.GetPrimaryKey());
    }

    public async Task UpdatePrivacySettings(bool isProfilePublic, bool allowEmail, bool allowPush)
    {
        state.State.IsProfilePublic = isProfilePublic;
        state.State.AllowEmailNotifications = allowEmail;
        state.State.AllowPushNotifications = allowPush;
        await state.WriteStateAsync();
    }

    public async Task UploadCredential(string credentialUrl)
    {
        state.State.Credentials.Add(credentialUrl);
        await state.WriteStateAsync();
    }

    public async Task AddApplicationId(Guid applicationId)
    {
        state.State.ApplicationIds.Add(applicationId);
        await state.WriteStateAsync();
    }

    public async Task RemoveApplicationId(Guid applicationId)
    {
        state.State.ApplicationIds.Remove(applicationId);
        await state.WriteStateAsync();
    }

    public Task<List<Guid>> GetApplications() => Task.FromResult(state.State.ApplicationIds);

    public async Task AddCompletedHours(double hours)
    {
        state.State.TotalHours += hours;
        state.State.ImpactScore = CalculateImpactScore();
        await state.WriteStateAsync();
    }

    public async Task IncrementCompletedOpportunities()
    {
        state.State.CompletedOpportunities++;
        state.State.ImpactScore = CalculateImpactScore();
        await state.WriteStateAsync();
    }

    public Task<bool> IsBlockedByOrg(Guid orgId)
        => Task.FromResult(state.State.BlockedByOrgIds.Contains(orgId));

    public Task SubmitFeedback(Guid opportunityId, int rating, string comment)
    {
        logger.LogInformation("Volunteer {VolunteerId} submitted feedback for {OpportunityId}: {Rating}/5",
            this.GetPrimaryKey(), opportunityId, rating);
        return Task.CompletedTask;
    }

    public async Task RegisterPushToken(string expoPushToken)
    {
        state.State.ExpoPushToken = expoPushToken;
        await state.WriteStateAsync();
        logger.LogInformation("Volunteer {Id} registered push token", this.GetPrimaryKey());
    }

    public Task<string?> GetPushToken() => Task.FromResult(state.State.ExpoPushToken);

    public async Task AddSkill(Guid skillId)
    {
        if (!state.State.SkillIds.Contains(skillId))
        {
            state.State.SkillIds.Add(skillId);
            await state.WriteStateAsync();
        }
    }

    public async Task RemoveSkill(Guid skillId)
    {
        state.State.SkillIds.Remove(skillId);
        await state.WriteStateAsync();
    }

    public Task<List<Guid>> GetSkillIds() => Task.FromResult(state.State.SkillIds);

    public async Task SetBackgroundCheckStatus(string status)
    {
        state.State.BackgroundCheckStatus = status;
        await state.WriteStateAsync();
        logger.LogInformation("Volunteer {Id} background check status set to {Status}", this.GetPrimaryKey(), status);
    }

    public async Task SignWaiver()
    {
        state.State.WaiverSignedAt = DateTime.UtcNow;
        await state.WriteStateAsync();
        logger.LogInformation("Volunteer {Id} signed waiver at {Time}", this.GetPrimaryKey(), state.State.WaiverSignedAt);
    }

    private double CalculateImpactScore()
        => (state.State.TotalHours * 2) + (state.State.CompletedOpportunities * 10);
}
