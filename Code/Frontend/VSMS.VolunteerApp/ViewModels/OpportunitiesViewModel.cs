using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp.ViewModels;

public partial class OpportunitiesViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    private List<OpportunityDetails> _allOpportunities = new();
    public ObservableCollection<OpportunityDetails> FilteredOpportunities { get; } = new();

    // Keep Opportunities for backward compatibility
    public ObservableCollection<OpportunityDetails> Opportunities => FilteredOpportunities;

    [ObservableProperty]
    bool isRefreshing;

    [ObservableProperty]
    string searchText = string.Empty;

    partial void OnSearchTextChanged(string value)
    {
        ApplyFilter();
    }

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
            var items = await _apiService.GetOpportunities();
            _allOpportunities = items ?? new List<OpportunityDetails>();
            ApplyFilter();
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

    private void ApplyFilter()
    {
        FilteredOpportunities.Clear();
        var query = SearchText?.Trim() ?? "";

        var filtered = string.IsNullOrEmpty(query)
            ? _allOpportunities
            : _allOpportunities.Where(o =>
                (o.Title?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (o.Description?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (o.VenueLocation?.City?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false)
            ).ToList();

        foreach (var item in filtered)
        {
            FilteredOpportunities.Add(item);
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
