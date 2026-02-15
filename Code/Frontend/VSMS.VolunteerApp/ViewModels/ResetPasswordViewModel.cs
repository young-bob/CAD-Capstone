using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

public partial class ResetPasswordViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string oldPassword = string.Empty;
    [ObservableProperty] string newPassword = string.Empty;
    [ObservableProperty] string confirmPassword = string.Empty;

    public ResetPasswordViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Reset Password";
    }

    [RelayCommand]
    async Task ResetPasswordAsync()
    {
        if (IsBusy) return;

        if (string.IsNullOrWhiteSpace(OldPassword) || string.IsNullOrWhiteSpace(NewPassword))
        {
            await Shell.Current.DisplayAlertAsync("Validation", "All fields are required.", "OK");
            return;
        }

        if (NewPassword.Length < 8)
        {
            await Shell.Current.DisplayAlertAsync("Validation", "New password must be at least 8 characters.", "OK");
            return;
        }

        if (NewPassword != ConfirmPassword)
        {
            await Shell.Current.DisplayAlertAsync("Validation", "New passwords do not match.", "OK");
            return;
        }

        try
        {
            IsBusy = true;
            await _apiService.ResetPassword(new ResetPasswordRequest(OldPassword, NewPassword));
            await Shell.Current.DisplayAlertAsync("Success", "Password reset successfully.", "OK");
            await Shell.Current.GoToAsync("..");
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
