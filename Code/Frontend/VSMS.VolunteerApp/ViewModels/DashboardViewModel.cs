using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Services;
namespace VSMS.VolunteerApp.ViewModels;

public partial class DashboardViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty]
    string volunteerName = "Volunteer";

    [ObservableProperty]
    double totalHours = 0;

    public DashboardViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Dashboard";
        LoadDashboardCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadDashboardAsync()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;
            var userIdString = await Services.TokenStorage.GetAsync("user_id");
            if (Guid.TryParse(userIdString, out var userId))
            {
                var profile = await _apiService.GetProfile(userId);
                if (profile != null)
                {
                    // Update UI with real data (Name/Email proxy for now if Name isn't explicitly on profile)
                    VolunteerName = profile.Email?.Split('@')[0] ?? "Volunteer";
                    TotalHours = profile.TotalHours;
                }
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to load dashboard data: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }
}
