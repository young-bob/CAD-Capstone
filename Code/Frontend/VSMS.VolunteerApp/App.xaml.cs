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
        // Perform auth check asynchronously to avoid deadlocking SecureStorage on the UI thread
        Task.Run(async () =>
        {
            try
            {
                var token = await Services.TokenStorage.GetAsync("auth_token");
                if (!string.IsNullOrEmpty(token))
                {
                    // Valid token, launch directly to dashboard
                    MainThread.BeginInvokeOnMainThread(async () =>
                    {
                        try
                        {
                            await Shell.Current.GoToAsync("//MainTabs/DashboardTab/DashboardPage");
                        }
                        catch (Exception e)
                        {
                            Console.WriteLine($"Nav error: {e.Message}");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"App startup token check failed: {ex}");
            }
        });

        return window;
    }
}