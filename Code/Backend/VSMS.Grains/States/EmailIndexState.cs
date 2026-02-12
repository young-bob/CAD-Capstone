using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class EmailIndexState
{
    [Id(0)]
    public Guid? UserId { get; set; }
}
