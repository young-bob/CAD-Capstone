using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ManageShiftsViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    public ObservableCollection<OpportunityDetails> Opportunities { get; } = new();

    [ObservableProperty] OpportunityDetails? selectedOpportunity;

    public ManageShiftsViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Create Shift";
        LoadOpportunitiesCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadOpportunitiesAsync()
    {
        try
        {
            var list = await _apiService.GetOpportunities();
            Opportunities.Clear();
            foreach (var item in list) Opportunities.Add(item);
        }
        catch { /* Ignore */ }
    }

    [RelayCommand]
    async Task CreateShiftAsync()
    {
        if (IsBusy || SelectedOpportunity == null) return;
        IsBusy = true;
        try
        {
            var userId = await SecureStorage.GetAsync("user_id") ?? "";
            if (Guid.TryParse(userId, out var uid))
            {
                await _apiService.CreateShift(uid, new CreateShiftRequest(SelectedOpportunity.Id));
                await Shell.Current.DisplayAlertAsync("Success", "Shift created.", "OK");
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }
}
