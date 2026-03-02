namespace VSMS.Abstractions.Messaging;

/// <summary>
/// Envelope that wraps serialized domain events for transport over Orleans Streams.
/// Lives in Abstractions so it can be shared between Infrastructure (publisher) and Grains (consumer).
/// </summary>
[GenerateSerializer]
public sealed class StreamEnvelope
{
    [Id(0)] public string EventTypeName { get; set; } = string.Empty;
    [Id(1)] public string PayloadJson { get; set; } = string.Empty;
}
