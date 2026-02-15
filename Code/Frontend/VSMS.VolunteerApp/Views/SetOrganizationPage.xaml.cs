using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class SetOrganizationPage : ContentPage
{
    public SetOrganizationPage(SetOrganizationViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
