using VSMS.Grains.Interfaces.Models;
using Orleans;

namespace VSMS.Grains.States;

[GenerateSerializer]
public class UserState
{
    [Id(0)]
    public User? User { get; set; }
}
