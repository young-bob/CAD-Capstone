using Microsoft.Extensions.Logging;
using Refit;
using VSMS.VolunteerApp.Services;
using VSMS.VolunteerApp.ViewModels;
using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // Services
        builder.Services.AddTransient<AuthHeaderHandler>();
        builder.Services.AddRefitClient<VSMS.VolunteerApp.Services.IVolunteerApiService>()
               .ConfigureHttpClient(c => c.BaseAddress = new Uri("http://localhost:8080"))
               .AddHttpMessageHandler<AuthHeaderHandler>();

        // Views & ViewModels
        builder.Services.AddTransient<VSMS.VolunteerApp.Views.LoginPage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.LoginViewModel>();

        builder.Services.AddTransient<VSMS.VolunteerApp.Views.DashboardPage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.DashboardViewModel>();

        builder.Services.AddTransient<VSMS.VolunteerApp.Views.OpportunitiesPage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.OpportunitiesViewModel>();

        builder.Services.AddTransient<VSMS.VolunteerApp.Views.OpportunityDetailPage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.OpportunityDetailViewModel>();

        builder.Services.AddTransient<VSMS.VolunteerApp.Views.ProfilePage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.ProfileViewModel>();

        builder.Services.AddTransient<VSMS.VolunteerApp.Views.RegisterPage>();
        builder.Services.AddTransient<VSMS.VolunteerApp.ViewModels.RegisterViewModel>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
