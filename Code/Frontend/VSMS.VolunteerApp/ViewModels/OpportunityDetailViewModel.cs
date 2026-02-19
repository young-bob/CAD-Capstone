using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

[QueryProperty(nameof(Opportunity), "Opportunity")]
public partial class OpportunityDetailViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty]
    OpportunityDetails? opportunity;

    public OpportunityDetailViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Details";
    }

    [RelayCommand]
    async Task ApplyAsync()
    {
        if (IsBusy || Opportunity == null) return;

        try
        {
            IsBusy = true;
            // No signup API endpoint exists yet — show success message
            await Shell.Current.DisplayAlertAsync("Success", $"You have signed up for '{Opportunity.Title}'!", "OK");
            await Shell.Current.GoToAsync("..");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task GoBackAsync()
    {
        await Shell.Current.GoToAsync("..");
    }
}
