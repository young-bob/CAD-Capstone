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
    private VolunteerProfile _profile;

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
            // Mock data for now
            await Task.Delay(500);
            Profile = new VolunteerProfile(
                "volunteer@example.com",
                "555-0123",
                "Passionate about community service.",
                25.5,
                new Location(43.46, -80.52, "Waterloo", "Waterloo", "ON", "N2L 3G1"),
                new List<string> { "Gardening", "Teaching" }
            );
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlert("Error", $"Unable to load profile: {ex.Message}", "OK");
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
        IsBusy = true;
        try
        {
            // Simulate API call
            await Task.Delay(1000);
            IsEditing = false;
            await Shell.Current.DisplayAlert("Success", "Profile updated successfully.", "OK");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlert("Error", $"Unable to save profile: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }
}
