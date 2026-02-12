using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class DashboardPage : ContentPage
{
	public DashboardPage(DashboardViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
