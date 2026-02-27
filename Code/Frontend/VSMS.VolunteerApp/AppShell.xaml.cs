using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp;

public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        // Register detail/push routes
        Routing.RegisterRoute(nameof(OpportunityDetailPage), typeof(OpportunityDetailPage));
        Routing.RegisterRoute(nameof(RegisterPage), typeof(RegisterPage));
        Routing.RegisterRoute(nameof(ResetPasswordPage), typeof(ResetPasswordPage));
        Routing.RegisterRoute(nameof(CertificateDetailPage), typeof(CertificateDetailPage));
        Routing.RegisterRoute(nameof(SkillDetailPage), typeof(SkillDetailPage));
    }
}
