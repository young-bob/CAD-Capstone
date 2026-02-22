using Microsoft.Extensions.DependencyInjection;

namespace VSMS.VolunteerApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = new Window(new AppShell());
        // Simple synchronous check for now, can be sophisticated later
        var token = Task.Run(() => Services.TokenStorage.GetAsync("auth_token")).Result;

        if (string.IsNullOrEmpty(token))
        {
            // If they are not logged in, force navigation to LoginPage
            Task.Run(async () =>
            {
                await Task.Delay(100); // Give Shell time to initialize
                await Shell.Current.GoToAsync("//LoginPage");
            });
        }
        else
        {
            // Valid token, launch directly to dashboard
            Task.Run(async () =>
            {
                await Task.Delay(100);
                await Shell.Current.GoToAsync("//MainTabs");
            });
        }

        return window;
    }
}