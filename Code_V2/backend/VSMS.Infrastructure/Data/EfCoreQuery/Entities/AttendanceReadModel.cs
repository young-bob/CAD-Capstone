using System;
using System.ComponentModel.DataAnnotations;
using VSMS.Abstractions.Enums;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class AttendanceReadModel
{
    [Key]
    public Guid AttendanceId { get; set; }
    public Guid OpportunityId { get; set; }
    public Guid VolunteerId { get; set; }

    [MaxLength(100)]
    public string VolunteerName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string OpportunityTitle { get; set; } = string.Empty;

    public AttendanceStatus Status { get; set; }
    public DateTime? ShiftStartTime { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public double TotalHours { get; set; }
}
