using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class SkillDetailPage : ContentPage
{
    public SkillDetailPage(SkillDetailViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
