using System;
using System.ComponentModel.DataAnnotations;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class DisputeReadModel
{
    [Key]
    public Guid AttendanceId { get; set; }
    public Guid VolunteerId { get; set; }

    [MaxLength(100)]
    public string VolunteerName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string OpportunityTitle { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(500)]
    public string EvidenceUrl { get; set; } = string.Empty;

    public DateTime RaisedAt { get; set; }
}
