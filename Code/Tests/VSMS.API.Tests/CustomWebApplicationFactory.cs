using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Moq;
using VSMS.Grains.Interfaces;

namespace VSMS.API.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public Mock<IClusterClient> MockClusterClient { get; } = new Mock<IClusterClient>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the Orleans background hosted service that attempts to connect to the Silo
            var hostedServices = services.Where(d => 
                d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService) && 
                (d.ImplementationType?.FullName?.Contains("Orleans") == true || 
                 d.ImplementationFactory?.Method.DeclaringType?.FullName?.Contains("Orleans") == true))
                .ToList();

            foreach (var hs in hostedServices)
            {
                services.Remove(hs);
            }

            // By doing this late phase descriptor, we override whatever Orleans client is injected
            var clusterClientDescriptors = services.Where(d => d.ServiceType == typeof(IClusterClient)).ToList();
            foreach (var descriptor in clusterClientDescriptors)
            {
                services.Remove(descriptor);
            }
            // Register the mocked one
            services.AddSingleton<IClusterClient>(MockClusterClient.Object);
        });

        // Use test configuration pointing explicitly at the simpler Mock Client environment.
        builder.UseEnvironment("Development");
        
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.Sources.Clear();
            var settings = new Dictionary<string, string?>
            {
                { "ORLEANS_CLUSTERING_TYPE", "Localhost" },
                { "Jwt:Key", "abcdefghijklmnopqrstuvwxyz1234567890" },
                { "Jwt:Issuer", "Test" },
                { "Jwt:Audience", "Test" }
            };
            config.AddInMemoryCollection(settings);
        });
    }
}
