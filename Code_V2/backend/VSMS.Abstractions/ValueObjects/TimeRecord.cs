using Orleans;

namespace VSMS.Abstractions.ValueObjects;

[GenerateSerializer]
public sealed record TimeRecord
{
    [Id(0)] public DateTime CheckInTime { get; init; }
    [Id(1)] public DateTime? CheckOutTime { get; set; }
    public double TotalHours => CheckOutTime.HasValue
        ? (CheckOutTime.Value - CheckInTime).TotalHours
        : 0;
}
