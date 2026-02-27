using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class VerifyCredentialsPage : ContentPage
{
    public VerifyCredentialsPage(VerifyCredentialsViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
