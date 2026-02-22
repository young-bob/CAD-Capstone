using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using Location = VSMS.VolunteerApp.Models.Location;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ProfileViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty]
    private VolunteerProfile? _profile;

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(ActionText))]
    private bool _isEditing;

    public string ActionText => IsEditing ? "Save" : "Edit";

    public ProfileViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        LoadProfileCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadProfileAsync()
    {
        IsBusy = true;
        try
        {
            var userIdString = await Services.TokenStorage.GetAsync("user_id");
            if (Guid.TryParse(userIdString, out var userId))
            {
                Profile = await _apiService.GetProfile(userId);
            }
            else
            {
                await Shell.Current.DisplayAlertAsync("Error", "User session not found. Please log in again.", "OK");
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
            var userIdString = await Services.TokenStorage.GetAsync("user_id");
            if (Guid.TryParse(userIdString, out var userId))
            {
                await _apiService.UpdateProfile(userId, Profile);
                IsEditing = false;
                await Shell.Current.DisplayAlertAsync("Success", "Profile updated successfully.", "OK");
            }
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

    [RelayCommand]
    private async Task LogoutAsync()
    {
        Services.TokenStorage.Remove("auth_token");
        Services.TokenStorage.Remove("user_id");
        await Shell.Current.GoToAsync("//LoginPage");
    }
}
