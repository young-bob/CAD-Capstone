using Orleans;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record GeoFenceSettings
{
    [Id(0)] public double Latitude { get; init; }
    [Id(1)] public double Longitude { get; init; }
    [Id(2)] public double RadiusMeters { get; init; } = 200;
}
