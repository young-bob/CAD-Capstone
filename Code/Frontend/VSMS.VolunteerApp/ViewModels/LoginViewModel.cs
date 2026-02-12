using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class LoginViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty]
    string email = string.Empty;

    [ObservableProperty]
    string password = string.Empty;

    public LoginViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Login";
    }

    [RelayCommand]
    async Task LoginAsync()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;
            // var token = await _apiService.Login(new { Email, Password });
            // await SecureStorage.SetAsync("auth_token", token);
            await Shell.Current.GoToAsync("//DashboardPage");
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
}
