using System.Data.Common;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using VSMS.Abstractions.Services;
using VSMS.Infrastructure;
using VSMS.Infrastructure.Search;
using VSMS.Infrastructure.Search.EfCoreQuery;

namespace VSMS.Tests.Integration.E2E.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string TestAuthScheme = TestAuthHandler.AuthenticationScheme;
    private readonly ClusterFixture _clusterFixture;

    public CustomWebApplicationFactory()
    {
        _clusterFixture = new ClusterFixture(); // Share the Orleans logic
    }

    public async Task InitializeAsync()
    {
        await _clusterFixture.InitializeAsync();
    }

    public new async Task DisposeAsync()
    {
        await _clusterFixture.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Add Orleans client from the TestCluster
        builder.ConfigureTestServices(services =>
        {
            // 1. Hook up the Orleans IGrainFactory from TestCluster
            services.AddSingleton(_clusterFixture.Cluster.Client);
            services.AddSingleton(_clusterFixture.Cluster.GrainFactory);

            // 2. Disable real JWT auth and use our TestAuthHandler
            services.AddAuthentication(TestAuthScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthScheme, options => { });

            // 3. Replace PostgreSQL with SQLite In-Memory for testing Read Models
            var dbContextOptionsTypes = services
                .Where(x => x.ServiceType.Name.Contains("DbContextOptions") || x.ServiceType == typeof(System.Data.Common.DbConnection))
                .ToList();

            foreach (var descriptor in dbContextOptionsTypes)
            {
                services.Remove(descriptor);
            }

            // Create a SQLite In-Memory shared connection and keep one instance open so it doesn't get destroyed
            var connectionString = "DataSource=vsms_e2e;Mode=Memory;Cache=Shared";
            var connection = new SqliteConnection(connectionString);
            connection.Open();

            services.AddSingleton<DbConnection>(connection);

            services.AddDbContext<AppDbContext>((container, options) =>
            {
                var conn = container.GetRequiredService<DbConnection>();
                options.UseSqlite(conn);
            });

            // Re-register EF Core Query Services to use the new DbContext
            services.AddScoped<IOpportunityQueryService, EfCoreOpportunityQueryService>();
            services.AddScoped<IApplicationQueryService, EfCoreApplicationQueryService>();
            services.AddScoped<IOrganizationQueryService, EfCoreOrganizationQueryService>();

            // 4. Create the schema
            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
            db.Database.EnsureCreated();
        });
    }

    public IGrainFactory GrainFactory => _clusterFixture.Cluster.GrainFactory;
}
