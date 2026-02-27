using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class ManageOpportunitiesPage : ContentPage
{
    public ManageOpportunitiesPage(ManageOpportunitiesViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
