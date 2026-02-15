using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ValidateAttendanceViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;
    public ObservableCollection<OpportunityDetails> Opportunities { get; } = new();
    [ObservableProperty] string volunteerIdText = string.Empty;
    [ObservableProperty] OpportunityDetails? selectedOpportunity;

    public ValidateAttendanceViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Validate Attendance";
        LoadCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadAsync()
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
    async Task ValidateAsync()
    {
        if (IsBusy) return;
        if (!Guid.TryParse(VolunteerIdText, out var volId) || SelectedOpportunity == null)
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Please enter a valid Volunteer ID and select an opportunity.", "OK");
            return;
        }
        IsBusy = true;
        try
        {
            var userId = await SecureStorage.GetAsync("user_id") ?? "";
            if (Guid.TryParse(userId, out var uid))
            {
                await _apiService.ValidateAttendance(uid, new ValidateAttendanceRequest(volId, SelectedOpportunity.Id));
                await Shell.Current.DisplayAlertAsync("Success", "Attendance validated.", "OK");
            }
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }
}
