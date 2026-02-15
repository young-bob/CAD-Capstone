using VSMS.VolunteerApp.ViewModels;
namespace VSMS.VolunteerApp.Views;

public partial class CertificateDetailPage : ContentPage
{
    public CertificateDetailPage(CertificateDetailViewModel viewModel)
    { InitializeComponent(); BindingContext = viewModel; }
}
