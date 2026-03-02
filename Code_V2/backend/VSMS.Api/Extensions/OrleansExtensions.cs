namespace VSMS.Api.Extensions;

public static class OrleansExtensions
{
    public static WebApplicationBuilder AddOrleansCluster(this WebApplicationBuilder builder)
    {
        builder.UseOrleans(silo =>
        {
            if (builder.Environment.IsDevelopment())
            {
                // Development: single silo, in-memory
                silo.UseLocalhostClustering();
                silo.AddMemoryGrainStorage("vsms");
                silo.UseInMemoryReminderService();
                silo.AddMemoryGrainStorage("PubSubStore");
                silo.AddMemoryStreams("StreamProvider");
            }
            else
            {
                var pgConnection = builder.Configuration.GetConnectionString("PostgreSQL")
                    ?? "Host=localhost;Port=5432;Database=vsms;Username=postgres;Password=postgres";

                // Production: PostgreSQL persistence
                var advertisedIp = builder.Configuration["Orleans:AdvertisedIP"];

                if (!string.IsNullOrEmpty(advertisedIp))
                {
                    // Multi-silo cluster mode (4-server deployment)
                    var clusterId = builder.Configuration["Orleans:ClusterId"] ?? "vsms-cluster";
                    var serviceId = builder.Configuration["Orleans:ServiceId"] ?? "vsms-service";
                    var siloPort = int.Parse(builder.Configuration["Orleans:SiloPort"] ?? "11111");
                    var gatewayPort = int.Parse(builder.Configuration["Orleans:GatewayPort"] ?? "30000");

                    silo.Configure<Orleans.Configuration.ClusterOptions>(options =>
                    {
                        options.ClusterId = clusterId;
                        options.ServiceId = serviceId;
                    });

                    silo.ConfigureEndpoints(
                        advertisedIP: System.Net.IPAddress.Parse(advertisedIp),
                        siloPort: siloPort,
                        gatewayPort: gatewayPort,
                        listenOnAnyHostAddress: true
                    );

                    silo.UseAdoNetClustering(options =>
                    {
                        options.Invariant = "Npgsql";
                        options.ConnectionString = pgConnection;
                    });
                }
                else
                {
                    // Single-silo production mode (single-server deployment)
                    silo.UseLocalhostClustering();
                }

                // Grain State Persistence (always use PostgreSQL in production)
                silo.AddAdoNetGrainStorage("vsms", options =>
                {
                    options.Invariant = "Npgsql";
                    options.ConnectionString = pgConnection;
                });

                // Reminders
                silo.UseAdoNetReminderService(options =>
                {
                    options.Invariant = "Npgsql";
                    options.ConnectionString = pgConnection;
                });

                silo.AddMemoryGrainStorage("PubSubStore");
                silo.AddMemoryStreams("StreamProvider");
            }
        });

        return builder;
    }
}
