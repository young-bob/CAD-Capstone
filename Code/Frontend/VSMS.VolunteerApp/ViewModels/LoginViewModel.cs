using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
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

        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Please enter both email and password.", "OK");
            return;
        }

        if (!Email.Contains("@") || !Email.Contains("."))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Please enter a valid email address.", "OK");
            return;
        }

        try
        {
            IsBusy = true;
            var response = await _apiService.Login(new LoginRequest(Email, Password));

            if (response?.Token != null)
            {
                await SecureStorage.SetAsync("auth_token", response.Token);
                await SecureStorage.SetAsync("user_id", response.UserId.ToString());
                await SecureStorage.SetAsync("user_role", response.Role ?? "Volunteer");
                await SecureStorage.SetAsync("user_name", response.Name ?? "User");
            }

            await Shell.Current.GoToAsync("//DashboardPage");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Login Failed", ex.Message, "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task GoToRegisterAsync()
    {
        await Shell.Current.GoToAsync(nameof(Views.RegisterPage));
    }

    [RelayCommand]
    async Task GoToResetPasswordAsync()
    {
        await Shell.Current.GoToAsync(nameof(Views.ResetPasswordPage));
    }
}
