using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class CertificatesPage : ContentPage
{
    public CertificatesPage(CertificatesViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
