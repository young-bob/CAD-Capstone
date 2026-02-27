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
    [ObservableProperty] string editAddress = string.Empty;
    [ObservableProperty] string editCity = string.Empty;
    [ObservableProperty] string editProvince = string.Empty;
    [ObservableProperty] string editPostalCode = string.Empty;

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

            PopulateEditFields();
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to load profile: {ex.Message}", "OK");
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to load profile: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    private void PopulateEditFields()
    {
        if (Profile == null) return;
        EditName = Profile.Name ?? "";
        EditPhone = Profile.PhoneNumber ?? "";
        EditBio = Profile.Bio ?? "";
        EditAddress = Profile.CurrentLocation?.Address ?? "";
        EditCity = Profile.CurrentLocation?.City ?? "";
        EditProvince = Profile.CurrentLocation?.Province ?? "";
        EditPostalCode = Profile.CurrentLocation?.PostalCode ?? "";
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

    [RelayCommand]
    private void CancelEdit()
    {
        PopulateEditFields();
        IsEditing = false;
    }

    private async Task SaveProfileAsync()
    {
        if (Profile == null) return;

        if (Profile == null) return;

        IsBusy = true;
        try
        {
            var location = new Location(
                Profile.CurrentLocation?.Latitude ?? 0,
                Profile.CurrentLocation?.Longitude ?? 0,
                EditAddress, EditCity, EditProvince, EditPostalCode
            );

            var updated = new VolunteerProfile(
                Profile.UserId, EditName, Profile.Email, EditPhone, EditBio,
                Profile.TotalHours, location, Profile.SkillIds
            );

            await _apiService.UpdateVolunteer(Profile.UserId, updated);
            Profile = updated;
            IsEditing = false;
            await Shell.Current.DisplayAlertAsync("Success", "Profile updated successfully.", "OK");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to save profile: {ex.Message}", "OK");
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to save profile: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private async Task LogoutAsync()
    {
        Services.TokenStorage.Remove("auth_token");
        Services.TokenStorage.Remove("user_id");
        await Shell.Current.GoToAsync("//LoginPage");
    }
}
