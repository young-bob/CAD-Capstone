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
    [ObservableProperty] int opportunityCount = 0;
    [ObservableProperty] int upcomingCount = 0;

    public ObservableCollection<OpportunityDetails> UpcomingOpportunities { get; } = new();

    public DashboardViewModel(IVolunteerApiService apiService)
    public DashboardViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
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

            // Load user info
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

            // Load volunteer profile for total hours
            try
            {
                var userIdStr = await SecureStorage.GetAsync("user_id");
                if (Guid.TryParse(userIdStr, out var userId))
                {
                    var profile = await _apiService.GetVolunteer(userId);
                    if (profile != null)
                    {
                        TotalHours = profile.TotalHours;
                    }
                }
            }
            catch { /* Ignore */ }

            // Load opportunities for stats and upcoming list
            try
            {
                var opportunities = await _apiService.GetOpportunities();
                OpportunityCount = opportunities.Count;

                var upcoming = opportunities
                    .Where(o => o.StartTime > DateTime.UtcNow)
                    .OrderBy(o => o.StartTime)
                    .Take(5)
                    .ToList();

                UpcomingCount = upcoming.Count;
                UpcomingOpportunities.Clear();
                foreach (var opp in upcoming)
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
