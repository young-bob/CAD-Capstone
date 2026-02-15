using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using Location = VSMS.VolunteerApp.Models.Location;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ManageOpportunitiesViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    public ObservableCollection<OpportunityDetails> Opportunities { get; } = new();

    [ObservableProperty] bool isCreating;
    [ObservableProperty] string newTitle = string.Empty;
    [ObservableProperty] string newDescription = string.Empty;
    [ObservableProperty] int newVisibility = 0;
    [ObservableProperty] DateTime newStartDate = DateTime.Today.AddDays(1);
    [ObservableProperty] TimeSpan newStartTime = new(9, 0, 0);
    [ObservableProperty] DateTime newEndDate = DateTime.Today.AddDays(1);
    [ObservableProperty] TimeSpan newEndTime = new(17, 0, 0);
    [ObservableProperty] string newAddress = string.Empty;
    [ObservableProperty] string newCity = string.Empty;
    [ObservableProperty] string newProvince = string.Empty;
    [ObservableProperty] string newPostalCode = string.Empty;
    [ObservableProperty] string newGeoFenceRadius = "100";
    [ObservableProperty] string newMaxVolunteers = "10";

    private string _orgId = string.Empty;

    public ManageOpportunitiesViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Manage Opportunities";
        LoadCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        try
        {
            _orgId = await SecureStorage.GetAsync("organization_id") ?? "";
            if (!string.IsNullOrEmpty(_orgId))
            {
                var list = await _apiService.GetOrganizationOpportunities(_orgId);
                Opportunities.Clear();
                foreach (var item in list) Opportunities.Add(item);
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    void ShowCreateForm() => IsCreating = true;

    [RelayCommand]
    void CancelCreate() => IsCreating = false;

    [RelayCommand]
    async Task CreateOpportunityAsync()
    {
        if (IsBusy) return;
        if (string.IsNullOrWhiteSpace(NewTitle))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Title is required.", "OK");
            return;
        }

        IsBusy = true;
        try
        {
            var startDt = NewStartDate.Date + NewStartTime;
            var endDt = NewEndDate.Date + NewEndTime;
            float.TryParse(NewGeoFenceRadius, out var radius);
            int.TryParse(NewMaxVolunteers, out var maxVol);

            var request = new CreateOpportunityRequest(
                Guid.Parse(_orgId), NewTitle, NewDescription,
                (OpportunityVisibility)NewVisibility,
                startDt, endDt,
                new Location(0, 0, NewAddress, NewCity, NewProvince, NewPostalCode),
                radius, maxVol
            );
            await _apiService.CreateOpportunity(request);
            IsCreating = false;
            await Shell.Current.DisplayAlertAsync("Success", "Opportunity created.", "OK");
            await LoadAsync();
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    async Task PublishAsync(OpportunityDetails opp)
    {
        if (opp == null || IsBusy) return;
        IsBusy = true;
        try
        {
            await _apiService.PublishOpportunity(_orgId, new PublishOpportunityRequest(opp.Id));
            await Shell.Current.DisplayAlertAsync("Success", $"'{opp.Title}' published.", "OK");
            await LoadAsync();
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }
}
