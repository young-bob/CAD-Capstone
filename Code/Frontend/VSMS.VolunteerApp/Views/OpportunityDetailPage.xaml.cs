using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class OpportunityDetailPage : ContentPage
{
    public OpportunityDetailPage(OpportunityDetailViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
