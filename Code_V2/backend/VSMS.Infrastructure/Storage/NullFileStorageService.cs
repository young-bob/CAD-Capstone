using Microsoft.Extensions.Logging;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Storage;

public class NullFileStorageService(ILogger<NullFileStorageService> logger) : IFileStorageService
{
    public Task<string> UploadAsync(Stream stream, string fileName, string folder = "uploads")
    {
        logger.LogInformation("[Stub] File upload: {FileName} to {Folder}", fileName, folder);
        return Task.FromResult($"/stub/{folder}/{fileName}");
    }

    public Task DeleteAsync(string fileUrl)
    {
        logger.LogInformation("[Stub] File delete: {FileUrl}", fileUrl);
        return Task.CompletedTask;
    }

    public Task<string> GetUrlAsync(string fileKey)
    {
        return Task.FromResult($"/stub/{fileKey}");
    }
}
