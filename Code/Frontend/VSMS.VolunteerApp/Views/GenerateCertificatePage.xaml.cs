using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class GenerateCertificatePage : ContentPage
{
    public GenerateCertificatePage(GenerateCertificateViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
