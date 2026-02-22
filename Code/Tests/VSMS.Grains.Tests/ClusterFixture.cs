using Microsoft.Extensions.Configuration;
using Orleans.TestingHost;

namespace VSMS.Grains.Tests;

public class ClusterFixture : IDisposable
{
    public TestCluster Cluster { get; private set; }

    public ClusterFixture()
    {
        var builder = new TestClusterBuilder();
        
        // Add required components depending on what grains use
        builder.AddSiloBuilderConfigurator<TestSiloConfigurator>();

        Cluster = builder.Build();
        Cluster.Deploy();
    }

    public void Dispose()
    {
        Cluster.StopAllSilos();
    }
}

public class TestSiloConfigurator : ISiloConfigurator
{
    public void Configure(ISiloBuilder siloBuilder)
    {
        siloBuilder.AddMemoryGrainStorage("grain-store");
        siloBuilder.AddMemoryGrainStorage("OrleansStorage");
        // NOTE: Depending on your specific grains you might need to add other services here
        // Ex: siloBuilder.AddMemoryGrainStorageAsDefault();
    }
}
