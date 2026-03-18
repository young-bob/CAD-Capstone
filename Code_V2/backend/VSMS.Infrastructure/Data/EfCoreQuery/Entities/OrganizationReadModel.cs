using System;
using System.ComponentModel.DataAnnotations;
using VSMS.Abstractions.Enums;

namespace VSMS.Infrastructure.Data.EfCoreQuery.Entities;

public class OrganizationReadModel
{
    [Key]
    public Guid OrgId { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    public OrgStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
