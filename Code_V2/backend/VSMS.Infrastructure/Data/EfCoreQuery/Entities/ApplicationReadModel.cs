using System;
using System.ComponentModel.DataAnnotations;
using VSMS.Abstractions.Enums;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class ApplicationReadModel
{
    [Key]
    public Guid ApplicationId { get; set; }
    public Guid OpportunityId { get; set; }
    public Guid ShiftId { get; set; }

    [MaxLength(100)]
    public string OpportunityTitle { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ShiftName { get; set; } = string.Empty;

    public DateTime ShiftStartTime { get; set; }
    public DateTime ShiftEndTime { get; set; }

    public Guid VolunteerId { get; set; }

    [MaxLength(100)]
    public string VolunteerName { get; set; } = string.Empty;

    public ApplicationStatus Status { get; set; }
    public DateTime AppliedAt { get; set; }
}
