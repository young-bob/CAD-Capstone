using Microsoft.Extensions.Configuration; // Add this namespace
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

try
{
    var builder = Host.CreateApplicationBuilder(args);

    builder.UseOrleans(silo =>
    {
        var clusteringType = builder.Configuration["ORLEANS_CLUSTERING_TYPE"];
        var connectionString = builder.Configuration.GetConnectionString("PostgreSQL");

        if (clusteringType == "AdoNet" && !string.IsNullOrEmpty(connectionString))
        {
            silo.UseAdoNetClustering(options =>
            {
                options.Invariant = "Npgsql";
                options.ConnectionString = connectionString;
            });
            silo.AddAdoNetGrainStorage("grain-store", options =>
            {
                options.Invariant = "Npgsql";
                options.ConnectionString = connectionString;
            });
        }
        else
        {
            silo.UseLocalhostClustering();
            if (!string.IsNullOrEmpty(connectionString))
            {
                silo.AddAdoNetGrainStorage("grain-store", options =>
                {
                    options.Invariant = "Npgsql";
                    options.ConnectionString = connectionString;
                });
            }
        }

        silo.ConfigureLogging(logging => logging.AddConsole());
    });

    using var host = builder.Build();
    await host.RunAsync();
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex);
    return 1;
}
return 0;
