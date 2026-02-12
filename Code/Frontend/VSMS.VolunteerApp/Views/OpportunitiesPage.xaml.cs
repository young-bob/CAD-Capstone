using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class OpportunitiesPage : ContentPage
{
    public OpportunitiesPage(OpportunitiesViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
