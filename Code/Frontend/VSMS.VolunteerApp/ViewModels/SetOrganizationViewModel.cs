using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class SetOrganizationViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;
    [ObservableProperty] string organizationIdText = string.Empty;

    public SetOrganizationViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Set Organization";
    }

    [RelayCommand]
    async Task SetOrganizationAsync()
    {
        if (IsBusy || string.IsNullOrWhiteSpace(OrganizationIdText)) return;
        IsBusy = true;
        try
        {
            var userId = await SecureStorage.GetAsync("user_id") ?? "";
            if (Guid.TryParse(userId, out var uid))
            {
                await _apiService.SetCoordinatorOrganization(uid, new SetOrganizationRequest(OrganizationIdText));
                await SecureStorage.SetAsync("organization_id", OrganizationIdText);
                await Shell.Current.DisplayAlertAsync("Success", "Organization linked.", "OK");
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }
}
