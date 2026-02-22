using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class RegisterViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty]
    string name = string.Empty;

    [ObservableProperty]
    string email = string.Empty;

    [ObservableProperty]
    string password = string.Empty;

    [ObservableProperty]
    string confirmPassword = string.Empty;

    [ObservableProperty]
    string phoneNumber = string.Empty;

    public RegisterViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Register";
    }

    [RelayCommand]
    async Task RegisterAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Email and password are required.", "OK");
            return;
        }

        if (Password != ConfirmPassword)
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Passwords do not match.", "OK");
            return;
        }

        if (IsBusy) return;

        try
        {
            IsBusy = true;
            await _apiService.Register(new
            {
                Name = Name,
                Email = Email,
                Password = Password,
                Role = "Volunteer",
                PhoneNumber = PhoneNumber
            });

            await Shell.Current.DisplayAlertAsync("Success", "Registration successful! Please log in.", "OK");
            await Shell.Current.GoToAsync("//LoginPage");
        }
        catch (Refit.ApiException ex)
        {
            var errorMsg = ex.StatusCode == System.Net.HttpStatusCode.Conflict
                ? "This email is already registered."
                : $"Registration failed: {ex.Message}";
            await Shell.Current.DisplayAlertAsync("Error", errorMsg, "OK");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Error", $"Registration failed: {ex.Message}", "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task GoToLoginAsync()
    {
        await Shell.Current.GoToAsync("//LoginPage");
    }
}
