using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VSMS.Grains.Interfaces;
using VSMS.Grains.Interfaces.Models;
using Xunit;

namespace VSMS.Grains.Tests;

[Collection(ClusterCollection.Name)]
public class CertificateGrainTests
{
    private readonly ClusterFixture _fixture;

    public CertificateGrainTests(ClusterFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Generate_ShouldCreateCertificateAndAllowRetrieval()
    {
        // Arrange
        var certId = Guid.NewGuid();
        var certGrain = _fixture.Cluster.GrainFactory.GetGrain<ICertificateGrain>(certId);
        var volunteerId = Guid.NewGuid();
        var templateId = Guid.NewGuid();
        var attendanceIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() };

        // Act
        await certGrain.Generate(volunteerId, attendanceIds, templateId);
        var retrievedCert = await certGrain.GetCertificate();
        var fileUrl = await certGrain.GetFileUrl();

        // Assert
        Assert.NotNull(retrievedCert);
        Assert.Equal(volunteerId, retrievedCert.VolunteerId);
        Assert.Equal(attendanceIds.Count, retrievedCert.AttendanceRecordIds.Count);
        
        Assert.NotEmpty(fileUrl);
        Assert.Contains(certId.ToString(), fileUrl);
    }

    [Fact]
    public async Task Sign_ShouldApplyCoordinatorSignature()
    {
        // Arrange
        var certId = Guid.NewGuid();
        var certGrain = _fixture.Cluster.GrainFactory.GetGrain<ICertificateGrain>(certId);
        var signatureName = "John Doe - Coordinator";
        
        // Generate first to have a base state
        await certGrain.Generate(Guid.NewGuid(), new List<Guid>(), Guid.NewGuid());

        // Act
        await certGrain.Sign(signatureName);
        var retrievedCert = await certGrain.GetCertificate();

        // Assert
        Assert.NotNull(retrievedCert);
        Assert.Equal(signatureName, retrievedCert.CoordinatorSignature);
    }
}
