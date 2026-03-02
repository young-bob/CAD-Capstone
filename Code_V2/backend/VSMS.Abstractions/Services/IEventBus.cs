namespace VSMS.Abstractions.Services;

public interface IEventBus
{
    Task PublishAsync<T>(T domainEvent) where T : class;
}

public interface IEventHandler<in TEvent> where TEvent : class
{
    Task HandleAsync(TEvent domainEvent);
}
