namespace VSMS.Abstractions.Services;

public interface IFileStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName, string folder = "uploads");
    Task DeleteAsync(string fileUrl);
    Task<string> GetUrlAsync(string fileKey);
    Task<(byte[] Content, string ContentType)> DownloadAsync(string fileKey);
}
