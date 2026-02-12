namespace VSMS.VolunteerApp.Models;

public record Location(
    double Latitude,
    double Longitude,
    string Address,
    string City,
    string Province,
    string PostalCode
);
