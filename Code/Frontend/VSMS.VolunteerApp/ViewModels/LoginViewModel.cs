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
            var response = await _apiService.Login(new { Email, Password });

            if (!string.IsNullOrEmpty(response.Token))
            {
                await Services.TokenStorage.SetAsync("auth_token", response.Token);
                await Services.TokenStorage.SetAsync("user_id", response.UserId.ToString());
                await Shell.Current.GoToAsync("//MainTabs");
            }
            else
            {
                await Shell.Current.DisplayAlertAsync("Error", "Invalid authentication token received.", "OK");
            }
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
    async Task GoToRegisterAsync()
    {
        await Shell.Current.GoToAsync(nameof(Views.RegisterPage));
    }
}
