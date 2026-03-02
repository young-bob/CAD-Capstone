using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Messaging;

// Using a simple awaited dispatcher for MVP (in production this would be a real MQ or Channel)
public class InMemoryEventBus(ILogger<InMemoryEventBus> logger, IServiceProvider serviceProvider) : IEventBus
{
    public async Task PublishAsync<T>(T domainEvent) where T : class
    {
        logger.LogInformation("[EventBus] Domain event published: {EventType}", typeof(T).Name);

        using var scope = serviceProvider.CreateScope();
        var handlers = scope.ServiceProvider.GetServices<IEventHandler<T>>();

        foreach (var handler in handlers)
        {
            try
            {
                await handler.HandleAsync(domainEvent);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error handling event {EventType} by {HandlerType}", typeof(T).Name, handler.GetType().Name);
            }
        }
    }
}
