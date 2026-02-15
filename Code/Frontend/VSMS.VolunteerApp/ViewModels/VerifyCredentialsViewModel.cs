using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class VerifyCredentialsViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string volunteerIdText = string.Empty;
    [ObservableProperty] string credentialIdText = string.Empty;

    public VerifyCredentialsViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Verify Credentials";
    }

    [RelayCommand]
    async Task VerifyAsync()
    {
        if (IsBusy) return;
        if (!Guid.TryParse(VolunteerIdText, out var volId) || !Guid.TryParse(CredentialIdText, out var credId))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Please enter valid UUIDs.", "OK");
            return;
        }
        IsBusy = true;
        try
        {
            var orgId = await SecureStorage.GetAsync("organization_id") ?? "";
            await _apiService.VerifyCredential(orgId, new VerifyCredentialRequest(volId, credId));
            await Shell.Current.DisplayAlertAsync("Success", "Credential verified successfully.", "OK");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }
}
