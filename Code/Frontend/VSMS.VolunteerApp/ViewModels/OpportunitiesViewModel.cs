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

            // Fetch from live backend API
            var items = await _apiService.GetOpportunities();

            foreach (var item in items)
            {
                Opportunities.Add(item);
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
