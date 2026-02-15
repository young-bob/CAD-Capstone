using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using VSMS.VolunteerApp.Views;
using Location = VSMS.VolunteerApp.Models.Location;

namespace VSMS.VolunteerApp.ViewModels;

public partial class OpportunitiesViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    public ObservableCollection<OpportunityDetails> Opportunities { get; } = new();

    [ObservableProperty]
    bool isRefreshing;

    public OpportunitiesViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Opportunities";
        LoadOpportunitiesCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadOpportunitiesAsync()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;
            Opportunities.Clear();

            try
            {
                var items = await _apiService.GetOpportunities();
                foreach (var item in items)
                {
                    Opportunities.Add(item);
                }
            }
            catch
            {
                var items = new List<OpportunityDetails>
                {
                   new OpportunityDetails(
                       Guid.NewGuid(), Guid.NewGuid(),
                       "Community Cleanup",
                       "Help clean up the park",
                       OpportunityVisibility.Public,
                       DateTime.UtcNow.AddDays(2),
                       DateTime.UtcNow.AddDays(2).AddHours(4),
                       new Location(43.46, -80.52, "Waterloo Park", "Waterloo", "ON", "N2L 3G1"),
                       100f, 10, 0
                   ),
                   new OpportunityDetails(
                       Guid.NewGuid(), Guid.NewGuid(),
                       "Food Bank Helper",
                       "Sort food donations",
                       OpportunityVisibility.Public,
                       DateTime.UtcNow.AddDays(5),
                       DateTime.UtcNow.AddDays(5).AddHours(3),
                       new Location(43.45, -80.49, "123 King St", "Kitchener", "ON", "N2H 1A1"),
                       50f, 5, 2
                   )
                };

                foreach (var item in items)
                {
                    Opportunities.Add(item);
                }
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Unable to load opportunities: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    async Task GoToDetailsAsync(OpportunityDetails opportunity)
    {
        if (opportunity == null) return;

        await Shell.Current.GoToAsync(nameof(OpportunityDetailPage), true, new Dictionary<string, object>
        {
            { "Opportunity", opportunity }
        });
    }
}
