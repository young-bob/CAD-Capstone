using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class OrganizationProfileViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] OrganizationProfile? organization;
    [ObservableProperty][NotifyPropertyChangedFor(nameof(ActionText))] bool isEditing;
    [ObservableProperty] string editDescription = string.Empty;
    [ObservableProperty] string editWebsite = string.Empty;
    [ObservableProperty] string editLogoUrl = string.Empty;
    [ObservableProperty] string editCalendarSyncUrl = string.Empty;

    public string ActionText => IsEditing ? "Save" : "Edit";
    public string VerificationText => Organization?.IsVerified == true ? "Verified" : "Pending";
    public Color VerificationColor => Organization?.IsVerified == true ? Colors.Green : Colors.Orange;

    public OrganizationProfileViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Organization";
        LoadCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        try
        {
            var orgId = await SecureStorage.GetAsync("organization_id");
            if (!string.IsNullOrEmpty(orgId))
            {
                Organization = await _apiService.GetOrganization(orgId);
                EditDescription = Organization?.Description ?? "";
                EditWebsite = Organization?.Website ?? "";
                EditLogoUrl = Organization?.LogoUrl ?? "";
                EditCalendarSyncUrl = Organization?.CalendarSyncUrl ?? "";
            }
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK");
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    async Task ToggleEditAsync()
    {
        if (IsEditing)
        {
            if (Organization == null) return;
            IsBusy = true;
            try
            {
                var updated = new OrganizationProfile(
                    Organization.OrganizationId, Organization.Name, EditDescription,
                    EditLogoUrl, EditWebsite, Organization.Location,
                    Organization.VerificationProof, Organization.IsVerified, EditCalendarSyncUrl
                );
                await _apiService.UpdateOrganization(Organization.OrganizationId.ToString(), updated);
                Organization = updated;
                IsEditing = false;
                await Shell.Current.DisplayAlertAsync("Success", "Profile updated.", "OK");
            }
            catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
            finally { IsBusy = false; }
        }
        else { IsEditing = true; }
    }

    [RelayCommand]
    void CancelEdit()
    {
        EditDescription = Organization?.Description ?? "";
        EditWebsite = Organization?.Website ?? "";
        EditLogoUrl = Organization?.LogoUrl ?? "";
        EditCalendarSyncUrl = Organization?.CalendarSyncUrl ?? "";
        IsEditing = false;
    }
}
