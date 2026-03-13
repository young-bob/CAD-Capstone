using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Api.Features.Auth;
using VSMS.Api.Middleware;
using VSMS.Infrastructure.EventHandlers;
using VSMS.Infrastructure.Messaging;
using VSMS.Infrastructure.Notifications;
using VSMS.Infrastructure.Data;
using VSMS.Infrastructure.Data.EfCoreQuery;
using VSMS.Infrastructure.Storage;

namespace VSMS.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static WebApplicationBuilder AddJwtAuthentication(this WebApplicationBuilder builder)
    {
        var jwtSettings = new JwtSettings();
        builder.Configuration.GetSection("Jwt").Bind(jwtSettings);
        builder.Services.AddSingleton(jwtSettings);

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))
                };
            });

        builder.Services.AddAuthorization();
        return builder;
    }

    public static WebApplicationBuilder AddDatabase(this WebApplicationBuilder builder)
    {
        var pgConnection = builder.Configuration.GetConnectionString("PostgreSQL")
            ?? "Host=localhost;Port=5432;Database=vsms;Username=postgres;Password=postgres";

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(pgConnection));

        return builder;
    }

    public static WebApplicationBuilder AddApplicationServices(this WebApplicationBuilder builder)
    {
        // Infrastructure
        // Infrastructure - MinIO File Storage
        builder.Services.Configure<VSMS.Infrastructure.Storage.MinioSettings>(
            builder.Configuration.GetSection("Minio"));
        builder.Services.AddSingleton<IFileStorageService, VSMS.Infrastructure.Storage.MinioFileStorageService>();
        builder.Services.AddSingleton<ISearchService, VSMS.Infrastructure.Data.NullSearchService>();
        builder.Services.AddSingleton<IEmailService, NullEmailService>();
        builder.Services.AddSingleton<IRealTimePushService, ExpoPushService>();

        // EventBus: switchable via appsettings "EventBus:Provider"
        var eventBusProvider = builder.Configuration.GetValue<string>("EventBus:Provider") ?? "InMemory";
        if (eventBusProvider.Equals("OrleansStream", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddSingleton<IEventBus, VSMS.Infrastructure.Messaging.OrleansStreamEventBus>();
        }
        else
        {
            builder.Services.AddSingleton<IEventBus, InMemoryEventBus>();
        }
        builder.Services.AddSingleton<ICertificateService, VSMS.Infrastructure.Certificates.QuestPdfCertificateService>();

        // Query Services
        builder.Services.AddScoped<IOrganizationQueryService, EfCoreOrganizationQueryService>();
        builder.Services.AddScoped<IOpportunityQueryService, EfCoreOpportunityQueryService>();
        builder.Services.AddScoped<IApplicationQueryService, EfCoreApplicationQueryService>();
        builder.Services.AddScoped<IAttendanceQueryService, EfCoreAttendanceQueryService>();

        // Event Handlers
        builder.Services.AddScoped<IEventHandler<OrganizationCreatedEvent>, OrganizationEventHandlers>();
        builder.Services.AddScoped<IEventHandler<OrganizationStatusChangedEvent>, OrganizationEventHandlers>();

        builder.Services.AddScoped<IEventHandler<OpportunityCreatedEvent>, OpportunityEventHandlers>();
        builder.Services.AddScoped<IEventHandler<OpportunityStatusChangedEvent>, OpportunityEventHandlers>();
        builder.Services.AddScoped<IEventHandler<OpportunitySpotsUpdatedEvent>, OpportunityEventHandlers>();

        builder.Services.AddScoped<IEventHandler<ApplicationSubmittedEvent>, ApplicationEventHandlers>();
        builder.Services.AddScoped<IEventHandler<ApplicationStatusChangedEvent>, ApplicationEventHandlers>();

        builder.Services.AddScoped<IEventHandler<AttendanceRecordedEvent>, AttendanceEventHandlers>();
        builder.Services.AddScoped<IEventHandler<AttendanceStatusChangedEvent>, AttendanceEventHandlers>();
        builder.Services.AddScoped<IEventHandler<DisputeRaisedEvent>, AttendanceEventHandlers>();
        builder.Services.AddScoped<IEventHandler<DisputeResolvedEvent>, AttendanceEventHandlers>();

        builder.Services.AddScoped<IEventHandler<UserBannedEvent>, UserBanEventHandlers>();
        builder.Services.AddScoped<IEventHandler<UserUnbannedEvent>, UserBanEventHandlers>();

        // Global exception handler
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddProblemDetails();

        return builder;
    }

    public static WebApplicationBuilder AddSwagger(this WebApplicationBuilder builder)
    {
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            var securityScheme = new OpenApiSecurityScheme
            {
                Name = "JWT Authentication",
                Description = "Enter JWT Bearer token **_only_**",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer", // must be lower case
                BearerFormat = "JWT",
                Reference = new OpenApiReference
                {
                    Id = JwtBearerDefaults.AuthenticationScheme,
                    Type = ReferenceType.SecurityScheme
                }
            };
            c.AddSecurityDefinition(securityScheme.Reference.Id, securityScheme);
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {securityScheme, new string[] { }}
            });
        });

        return builder;
    }
}
