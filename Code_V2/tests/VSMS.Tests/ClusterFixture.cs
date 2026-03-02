using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Orleans.TestingHost;
using VSMS.Abstractions.Events;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure;
using VSMS.Infrastructure.EventHandlers;
using VSMS.Infrastructure.Messaging;
using VSMS.Infrastructure.Notifications;
using VSMS.Infrastructure.Search;
using VSMS.Infrastructure.Search.EfCoreQuery;
using VSMS.Infrastructure.Storage;

namespace VSMS.Tests;

/// <summary>
/// Configures the Orleans test cluster with in-memory storage and null services.
/// Shared across all test classes via xUnit collection fixture.
/// </summary>
public sealed class ClusterFixture : IAsyncLifetime
{
    public TestCluster Cluster { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var builder = new TestClusterBuilder();
        builder.AddSiloBuilderConfigurator<SiloConfigurator>();
        Cluster = builder.Build();
        await Cluster.DeployAsync();
    }

    public async Task DisposeAsync()
    {
        await Cluster.StopAllSilosAsync();
    }

    private class SiloConfigurator : ISiloConfigurator
    {
        public void Configure(ISiloBuilder siloBuilder)
        {
            siloBuilder.AddMemoryGrainStorage("vsms");
            siloBuilder.UseInMemoryReminderService();
            siloBuilder.Services.AddSingleton<IFileStorageService, NullFileStorageService>();
            siloBuilder.Services.AddSingleton<ISearchService, NullSearchService>();
            siloBuilder.Services.AddSingleton<IEmailService, NullEmailService>();
            siloBuilder.Services.AddSingleton<IRealTimePushService, NullRealTimePushService>();
            siloBuilder.Services.AddSingleton<IEventBus, InMemoryEventBus>();

            // E2E Test EF Core shared read models setup inside Silo
            var connectionString = "DataSource=vsms_e2e;Mode=Memory;Cache=Shared";
            var connection = new SqliteConnection(connectionString);
            connection.Open(); // keep alive

            siloBuilder.Services.AddSingleton<System.Data.Common.DbConnection>(connection);
            siloBuilder.Services.AddDbContext<AppDbContext>((container, options) =>
            {
                var conn = container.GetRequiredService<System.Data.Common.DbConnection>();
                options.UseSqlite(conn);
            });

            siloBuilder.Services.AddScoped<IEventHandler<OpportunityCreatedEvent>, OpportunityEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<OpportunityStatusChangedEvent>, OpportunityEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<OpportunitySpotsUpdatedEvent>, OpportunityEventHandlers>();

            siloBuilder.Services.AddScoped<IEventHandler<ApplicationSubmittedEvent>, ApplicationEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<ApplicationStatusChangedEvent>, ApplicationEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<AttendanceRecordedEvent>, AttendanceEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<AttendanceStatusChangedEvent>, AttendanceEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<DisputeRaisedEvent>, AttendanceEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<DisputeResolvedEvent>, AttendanceEventHandlers>();

            siloBuilder.Services.AddScoped<IEventHandler<OrganizationCreatedEvent>, OrganizationEventHandlers>();
            siloBuilder.Services.AddScoped<IEventHandler<OrganizationStatusChangedEvent>, OrganizationEventHandlers>();
        }
    }
}

[CollectionDefinition(Name)]
public class ClusterCollection : ICollectionFixture<ClusterFixture>
{
    public const string Name = "ClusterCollection";
}
