using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class OrganizationProfilePage : ContentPage
{
    public OrganizationProfilePage(OrganizationProfileViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
