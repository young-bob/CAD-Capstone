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
        Console.WriteLine($"[LoginViewModel] LoginAsync invoked. IsBusy={IsBusy} Email={Email}");
        if (IsBusy) return;

        try
        {
            IsBusy = true;
            var response = await _apiService.Login(new { Email, Password });

            if (!string.IsNullOrEmpty(response.Token))
            {
                await Services.TokenStorage.SetAsync("auth_token", response.Token);
                await Services.TokenStorage.SetAsync("user_id", response.UserId.ToString());
                try
                {
                    await Shell.Current.GoToAsync("//MainTabs/DashboardTab/DashboardPage");
                }
                catch (Exception navEx)
                {
                    Console.WriteLine($"[LoginViewModel] Nav Error: {navEx}");
                    if (Application.Current?.Windows.Count > 0)
                        await Application.Current.Windows[0].Page!.DisplayAlert("Nav Error", $"Login Nav: {navEx}", "OK");
                }
            }
            else
            {
                Console.WriteLine("[LoginViewModel] Invalid Token");
                if (Application.Current?.Windows.Count > 0)
                    await Application.Current.Windows[0].Page!.DisplayAlert("Error", "Invalid authentication token received.", "OK");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LoginViewModel] Error: {ex}");
            if (Application.Current?.Windows.Count > 0)
                await Application.Current.Windows[0].Page!.DisplayAlert("Error", $"Login Failed: {ex}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task GoToRegisterAsync()
    {
        Console.WriteLine("[LoginViewModel] GoToRegisterAsync executing!");
        try
        {
            Console.WriteLine("[LoginViewModel] Executing GoToAsync(//RegisterPage)");
            await Shell.Current.GoToAsync("//RegisterPage");
            Console.WriteLine("[LoginViewModel] GoToAsync completed successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LoginViewModel] Navigation Error: {ex}");
            if (Application.Current?.Windows.Count > 0)
                await Application.Current.Windows[0].Page!.DisplayAlert("Navigation Error", $"GoToRegister: {ex}", "OK");
        }
    }
}
