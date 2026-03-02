using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Orleans.Streams;
using VSMS.Abstractions.Messaging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Messaging;

/// <summary>
/// Orleans Streams-based EventBus implementation.
/// Publishes domain events to Orleans Memory/Persistent Streams.
/// Events are consumed by StreamConsumerGrain which dispatches to IEventHandler&lt;T&gt;.
///
/// Advantages over InMemoryEventBus:
/// - Works across multiple silos in a cluster
/// - Non-blocking: Grain can fire-and-forget
/// - Built-in back-pressure and delivery guarantees (with persistent providers)
/// </summary>
public class OrleansStreamEventBus(
    IClusterClient clusterClient,
    ILogger<OrleansStreamEventBus> logger) : IEventBus
{
    private const string StreamProviderName = "StreamProvider";
    private const string StreamNamespace = "DomainEvents";

    public async Task PublishAsync<T>(T domainEvent) where T : class
    {
        var eventType = typeof(T).Name;
        logger.LogInformation("[OrleansStream] Publishing {EventType}", eventType);

        var streamProvider = clusterClient.GetStreamProvider(StreamProviderName);

        // Use the event type name as a deterministic stream key
        // so all events of the same type go to the same stream
        var streamId = StreamId.Create(StreamNamespace, eventType);
        var stream = streamProvider.GetStream<StreamEnvelope>(streamId);

        var envelope = new StreamEnvelope
        {
            EventTypeName = typeof(T).AssemblyQualifiedName!,
            PayloadJson = JsonSerializer.Serialize(domainEvent)
        };

        await stream.OnNextAsync(envelope);
    }
}
