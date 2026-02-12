using Orleans;

namespace VSMS.Grains.Interfaces.Models;

[GenerateSerializer]
public record Location(
    double Latitude, 
    double Longitude, 
    string Address, 
    string City, 
    string Province, 
    string PostalCode
);
