using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Orleans.Streams;
using VSMS.Abstractions.Messaging;
using VSMS.Abstractions.Services;

namespace VSMS.Grains;

/// <summary>
/// Implicit stream subscriber that listens to all domain events on the "DomainEvents" namespace.
/// When an event arrives, it deserializes the envelope and dispatches to all registered IEventHandler&lt;T&gt;.
/// </summary>
[ImplicitStreamSubscription("DomainEvents")]
public class StreamConsumerGrain(
    ILogger<StreamConsumerGrain> logger,
    IServiceProvider serviceProvider) : Grain, IGrainWithStringKey
{
    public override async Task OnActivateAsync(CancellationToken ct)
    {
        var streamProvider = this.GetStreamProvider("StreamProvider");
        var streamId = StreamId.Create("DomainEvents", this.GetPrimaryKeyString());
        var stream = streamProvider.GetStream<StreamEnvelope>(streamId);

        await stream.SubscribeAsync(OnNextAsync);
        logger.LogInformation("[StreamConsumer] Subscribed to stream: {StreamKey}", this.GetPrimaryKeyString());
    }

    private async Task OnNextAsync(StreamEnvelope envelope, StreamSequenceToken? token)
    {
        logger.LogInformation("[StreamConsumer] Received event: {EventType}", envelope.EventTypeName);

        try
        {
            var eventType = Type.GetType(envelope.EventTypeName);
            if (eventType is null)
            {
                logger.LogWarning("[StreamConsumer] Unknown event type: {EventType}", envelope.EventTypeName);
                return;
            }

            var domainEvent = JsonSerializer.Deserialize(envelope.PayloadJson, eventType);
            if (domainEvent is null) return;

            // Resolve all IEventHandler<T> for this event type
            var handlerType = typeof(IEventHandler<>).MakeGenericType(eventType);

            using var scope = serviceProvider.CreateScope();
            var handlers = scope.ServiceProvider.GetServices(handlerType);

            foreach (var handler in handlers)
            {
                var handleMethod = handlerType.GetMethod("HandleAsync");
                if (handleMethod is not null)
                {
                    var task = (Task)handleMethod.Invoke(handler, [domainEvent])!;
                    await task;
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[StreamConsumer] Error processing event: {EventType}", envelope.EventTypeName);
        }
    }
}
