using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class GenerateCertificateViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string volunteerIdText = string.Empty;
    [ObservableProperty] string attendanceIdsText = string.Empty;
    [ObservableProperty] string templateIdText = string.Empty;

    public GenerateCertificateViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Generate Certificate";
    }

    [RelayCommand]
    async Task GenerateAsync()
    {
        if (IsBusy) return;
        if (!Guid.TryParse(VolunteerIdText, out var volId) || !Guid.TryParse(TemplateIdText, out var templateId))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Please enter valid UUIDs.", "OK");
            return;
        }

        var attendanceIds = new List<Guid>();
        if (!string.IsNullOrWhiteSpace(AttendanceIdsText))
        {
            foreach (var part in AttendanceIdsText.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (Guid.TryParse(part, out var aid)) attendanceIds.Add(aid);
            }
        }

        IsBusy = true;
        try
        {
            await _apiService.GenerateCertificate(new CertificateRequest(volId, attendanceIds, templateId));
            await Shell.Current.DisplayAlertAsync("Success", "Certificate generated.", "OK");
            await Shell.Current.GoToAsync("..");
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }
}
