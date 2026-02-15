using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class ManageShiftsPage : ContentPage
{
    public ManageShiftsPage(ManageShiftsViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
