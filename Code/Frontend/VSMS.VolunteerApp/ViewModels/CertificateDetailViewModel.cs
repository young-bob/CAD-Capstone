using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

[QueryProperty(nameof(CertificateId), "CertificateId")]
public partial class CertificateDetailViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string certificateId = string.Empty;
    [ObservableProperty] CertificateDetails? certificate;
    [ObservableProperty] string signatureText = string.Empty;
    [ObservableProperty] bool canSign;

    public string SignatureStatus => Certificate?.IsSigned == true
        ? $"Signed by: {Certificate.CoordinatorSignature}" : "Not yet signed";

    public CertificateDetailViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Certificate Details";
    }

    partial void OnCertificateIdChanged(string value)
    {
        if (Guid.TryParse(value, out _))
            LoadCertificateCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadCertificateAsync()
    {
        if (IsBusy || !Guid.TryParse(CertificateId, out var id)) return;
        IsBusy = true;
        try
        {
            Certificate = await _apiService.GetCertificate(id);
            OnPropertyChanged(nameof(SignatureStatus));
            var role = await SecureStorage.GetAsync("user_role");
            CanSign = role == "Coordinator" && Certificate?.IsSigned != true;
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    async Task SignAsync()
    {
        if (IsBusy || string.IsNullOrWhiteSpace(SignatureText) || !Guid.TryParse(CertificateId, out var id)) return;
        IsBusy = true;
        try
        {
            await _apiService.SignCertificate(id, new SignatureRequest(SignatureText));
            await Shell.Current.DisplayAlertAsync("Success", "Certificate signed.", "OK");
            await LoadCertificateAsync();
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }
}
