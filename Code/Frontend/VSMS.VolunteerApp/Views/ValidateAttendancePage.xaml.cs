using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class ValidateAttendancePage : ContentPage
{
    public ValidateAttendancePage(ValidateAttendanceViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
