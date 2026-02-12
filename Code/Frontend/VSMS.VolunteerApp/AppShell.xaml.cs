using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp;

public partial class AppShell : Shell
{
    public AppShell()
    {
        InitializeComponent();

        Routing.RegisterRoute(nameof(OpportunityDetailPage), typeof(OpportunityDetailPage));
    }
}
