using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class SkillsPage : ContentPage
{
    public SkillsPage(SkillsViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
