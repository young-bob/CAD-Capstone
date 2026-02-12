using VSMS.VolunteerApp.ViewModels;

namespace VSMS.VolunteerApp.Views;

public partial class ProfilePage : ContentPage
{
	public ProfilePage(ProfileViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
