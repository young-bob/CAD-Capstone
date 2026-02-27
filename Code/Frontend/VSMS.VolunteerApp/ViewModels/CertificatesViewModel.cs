using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp.ViewModels;

public partial class CertificatesViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;
    public ObservableCollection<CertificateDetails> Certificates { get; } = new();

    public CertificatesViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Certificates";
    }

    [RelayCommand]
    async Task ViewDetailAsync(CertificateDetails cert)
    {
        if (cert == null) return;
        await Shell.Current.GoToAsync(nameof(CertificateDetailPage), true, new Dictionary<string, object>
        {
            { "CertificateId", cert.Id.ToString() }
        });
    }

    [RelayCommand]
    async Task DownloadAsync(CertificateDetails cert)
    {
        if (cert == null || IsBusy) return;
        IsBusy = true;
        try
        {
            var response = await _apiService.DownloadCertificate(cert.Id);
            if (response.IsSuccessStatusCode)
            {
                await Shell.Current.DisplayAlertAsync("Success", "Certificate downloaded.", "OK");
            }
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }
}
