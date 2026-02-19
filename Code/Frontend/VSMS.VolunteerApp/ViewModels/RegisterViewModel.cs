using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using Location = VSMS.VolunteerApp.Models.Location;

namespace VSMS.VolunteerApp.ViewModels;

public partial class RegisterViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string name = string.Empty;
    [ObservableProperty] string email = string.Empty;
    [ObservableProperty] string password = string.Empty;
    [ObservableProperty] string phoneNumber = string.Empty;
    [ObservableProperty] string bio = string.Empty;
    [ObservableProperty] string address = string.Empty;
    [ObservableProperty] string city = string.Empty;
    [ObservableProperty] string province = string.Empty;
    [ObservableProperty] string postalCode = string.Empty;

    public RegisterViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Register";
    }

    [RelayCommand]
    async Task RegisterAsync()
    {
        if (IsBusy) return;

        if (string.IsNullOrWhiteSpace(Name) || string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Name, email, and password are required.", "OK");
            return;
        }

        if (Password.Length < 8)
        {
            await Shell.Current.DisplayAlertAsync("Validation", "Password must be at least 8 characters.", "OK");
            return;
        }

        try
        {
            IsBusy = true;

            var location = new Location(0, 0, Address, City, Province, PostalCode);
            var request = new RegisterRequest(Name, Email, Password, "Volunteer", PhoneNumber, Bio, location);
            await _apiService.Register(request);

            await Shell.Current.DisplayAlertAsync("Success", "Account created! Please login.", "OK");
            await Shell.Current.GoToAsync("..");
        }
        catch (Exception ex)
        {
            await Shell.Current.DisplayAlertAsync("Registration Failed", ex.Message, "OK");
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    async Task GoToLoginAsync()
    {
        await Shell.Current.GoToAsync("..");
    }
}
