using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using Location = VSMS.VolunteerApp.Models.Location;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ProfileViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] VolunteerProfile? profile;
    [ObservableProperty][NotifyPropertyChangedFor(nameof(ActionText))] bool isEditing;
    [ObservableProperty] string editName = string.Empty;
    [ObservableProperty] string editPhone = string.Empty;
    [ObservableProperty] string editBio = string.Empty;

    public string ActionText => IsEditing ? "Save" : "Edit";

    public ProfileViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Profile";
        LoadProfileCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadProfileAsync()
    {
        IsBusy = true;
        try
        {
            var userIdStr = await SecureStorage.GetAsync("user_id");
            if (Guid.TryParse(userIdStr, out var userId))
            {
                try
                {
                    Profile = await _apiService.GetVolunteer(userId);
                }
                catch
                {
                    Profile = new VolunteerProfile(
                        userId, "Volunteer", "volunteer@example.com",
                        "555-0123", "Passionate about community service.",
                        25.5,
                        new Location(43.46, -80.52, "Waterloo", "Waterloo", "ON", "N2L 3G1"),
                        new List<Guid>()
                    );
                }
            }
            else
            {
                Profile = new VolunteerProfile(
                    Guid.Empty, "Volunteer", "volunteer@example.com",
                    "555-0123", "Passionate about community service.",
                    25.5,
                    new Location(43.46, -80.52, "Waterloo", "Waterloo", "ON", "N2L 3G1"),
                    new List<Guid>()
                );
            }

            if (Profile != null)
            {
                EditName = Profile.Name ?? "";
                EditPhone = Profile.PhoneNumber ?? "";
                EditBio = Profile.Bio ?? "";
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to load profile: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task ToggleEditAsync()
    {
        if (IsEditing)
        {
            await SaveProfileAsync();
        }
        else
        {
            IsEditing = true;
        }
    }

    private async Task SaveProfileAsync()
    {
        if (Profile == null) return;

        IsBusy = true;
        try
        {
            var updated = new VolunteerProfile(
                Profile.UserId, EditName, Profile.Email, EditPhone, EditBio,
                Profile.TotalHours, Profile.CurrentLocation, Profile.SkillIds
            );

            await _apiService.UpdateVolunteer(Profile.UserId, updated);
            Profile = updated;
            IsEditing = false;
            await Shell.Current.DisplayAlertAsync("Success", "Profile updated successfully.", "OK");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to save profile: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }
}
