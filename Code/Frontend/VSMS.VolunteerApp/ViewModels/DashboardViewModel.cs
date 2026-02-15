using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class DashboardViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string volunteerName = "User";
    [ObservableProperty] string userRole = "Volunteer";
    [ObservableProperty] double totalHours = 0;

    public ObservableCollection<OpportunityDetails> UpcomingOpportunities { get; } = new();

    public DashboardViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Dashboard";
        LoadDataCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadDataAsync()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;

            var storedName = await SecureStorage.GetAsync("user_name");
            var storedRole = await SecureStorage.GetAsync("user_role");
            if (!string.IsNullOrEmpty(storedName)) VolunteerName = storedName;
            if (!string.IsNullOrEmpty(storedRole)) UserRole = storedRole;

            try
            {
                var userInfo = await _apiService.GetCurrentUser();
                if (userInfo != null)
                {
                    VolunteerName = userInfo.Name ?? "User";
                    UserRole = userInfo.Role ?? "Volunteer";
                }
            }
            catch { /* Use stored values */ }

            try
            {
                var opportunities = await _apiService.GetOpportunities();
                UpcomingOpportunities.Clear();
                foreach (var opp in opportunities.Take(5))
                {
                    UpcomingOpportunities.Add(opp);
                }
            }
            catch { /* Ignore if API unavailable */ }
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task LogoutAsync()
    {
        try
        {
            await _apiService.Logout();
        }
        catch { /* Ignore logout errors */ }

        SecureStorage.RemoveAll();
        await Shell.Current.GoToAsync("//LoginPage");
    }
}
