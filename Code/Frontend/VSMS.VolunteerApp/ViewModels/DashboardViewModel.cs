using CommunityToolkit.Mvvm.ComponentModel;

namespace VSMS.VolunteerApp.ViewModels;

public partial class DashboardViewModel : BaseViewModel
{
    [ObservableProperty]
    string volunteerName = "Volunteer";

    [ObservableProperty]
    double totalHours = 0;

    public DashboardViewModel()
    {
        Title = "Dashboard";
    }
}
