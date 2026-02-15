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

        // Auth token handler
        builder.Services.AddTransient<AuthTokenHandler>();

        // Refit API Service with AuthTokenHandler
        builder.Services.AddRefitClient<IVolunteerApiService>()
               .ConfigureHttpClient(c => c.BaseAddress = new Uri("http://localhost:5000")) // TODO: Use DevTunnel/Local IP
               .AddHttpMessageHandler<AuthTokenHandler>();

        // ---- ViewModels ----
        builder.Services.AddTransient<LoginViewModel>();
        builder.Services.AddTransient<RegisterViewModel>();
        builder.Services.AddTransient<ResetPasswordViewModel>();
        builder.Services.AddTransient<DashboardViewModel>();
        builder.Services.AddTransient<OpportunitiesViewModel>();
        builder.Services.AddTransient<OpportunityDetailViewModel>();
        builder.Services.AddTransient<ProfileViewModel>();
        builder.Services.AddTransient<OrganizationProfileViewModel>();
        builder.Services.AddTransient<ManageOpportunitiesViewModel>();
        builder.Services.AddTransient<VerifyCredentialsViewModel>();
        builder.Services.AddTransient<SetOrganizationViewModel>();
        builder.Services.AddTransient<ManageShiftsViewModel>();
        builder.Services.AddTransient<ValidateAttendanceViewModel>();
        builder.Services.AddTransient<CertificatesViewModel>();
        builder.Services.AddTransient<CertificateDetailViewModel>();
        builder.Services.AddTransient<GenerateCertificateViewModel>();
        builder.Services.AddTransient<SkillsViewModel>();
        builder.Services.AddTransient<SkillDetailViewModel>();

        // ---- Views ----
        builder.Services.AddTransient<LoginPage>();
        builder.Services.AddTransient<RegisterPage>();
        builder.Services.AddTransient<ResetPasswordPage>();
        builder.Services.AddTransient<DashboardPage>();
        builder.Services.AddTransient<OpportunitiesPage>();
        builder.Services.AddTransient<OpportunityDetailPage>();
        builder.Services.AddTransient<ProfilePage>();
        builder.Services.AddTransient<OrganizationProfilePage>();
        builder.Services.AddTransient<ManageOpportunitiesPage>();
        builder.Services.AddTransient<VerifyCredentialsPage>();
        builder.Services.AddTransient<SetOrganizationPage>();
        builder.Services.AddTransient<ManageShiftsPage>();
        builder.Services.AddTransient<ValidateAttendancePage>();
        builder.Services.AddTransient<CertificatesPage>();
        builder.Services.AddTransient<CertificateDetailPage>();
        builder.Services.AddTransient<GenerateCertificatePage>();
        builder.Services.AddTransient<SkillsPage>();
        builder.Services.AddTransient<SkillDetailPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
