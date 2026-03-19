using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Storage;

public class MinioSettings
{
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string BucketName { get; set; } = "vsms";
    public bool UseSsl { get; set; } = false;
}

/// <summary>
/// MinIO-based implementation of IFileStorageService.
/// Stores volunteer credentials, proof photos, and other files in a MinIO bucket.
/// </summary>
public class MinioFileStorageService : IFileStorageService
{
    private readonly IMinioClient _client;
    private readonly MinioSettings _settings;
    private readonly ILogger<MinioFileStorageService> _logger;

    public MinioFileStorageService(IOptions<MinioSettings> options, ILogger<MinioFileStorageService> logger)
    {
        _settings = options.Value;
        _logger = logger;

        _client = new MinioClient()
            .WithEndpoint(_settings.Endpoint)
            .WithCredentials(_settings.AccessKey, _settings.SecretKey)
            .WithSSL(_settings.UseSsl)
            .Build();
    }

    /// <summary>
    /// Ensures the configured bucket exists, creating it if necessary.
    /// </summary>
    private async Task EnsureBucketAsync()
    {
        var found = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_settings.BucketName));

        if (!found)
        {
            await _client.MakeBucketAsync(
                new MakeBucketArgs().WithBucket(_settings.BucketName));
            _logger.LogInformation("Created MinIO bucket: {Bucket}", _settings.BucketName);
        }
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string folder = "uploads")
    {
        await EnsureBucketAsync();

        var objectKey = $"{folder}/{Guid.NewGuid():N}_{fileName}";
        var contentType = GetContentType(fileName);

        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(contentType));

        _logger.LogInformation("Uploaded file to MinIO: {ObjectKey}", objectKey);

        // Return a relative key that can be used for GetUrlAsync / DeleteAsync
        return objectKey;
    }

    public async Task DeleteAsync(string fileKey)
    {
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(fileKey));

        _logger.LogInformation("Deleted file from MinIO: {FileKey}", fileKey);
    }

    public async Task<string> GetUrlAsync(string fileKey)
    {
        // Generate a presigned URL valid for 1 hour
        var url = await _client.PresignedGetObjectAsync(new PresignedGetObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(fileKey)
            .WithExpiry(3600));

        return url;
    }

    public async Task<(byte[] Content, string ContentType)> DownloadAsync(string fileKey)
    {
        await EnsureBucketAsync();
        var stat = await _client.StatObjectAsync(new StatObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(fileKey));

        await using var ms = new MemoryStream();
        await _client.GetObjectAsync(new GetObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(fileKey)
            .WithCallbackStream(stream => stream.CopyTo(ms)));

        if (ms.Length == 0)
            throw new InvalidOperationException($"Downloaded file is empty: {fileKey}");

        var contentType = string.IsNullOrWhiteSpace(stat.ContentType)
            ? GetContentType(fileKey)
            : stat.ContentType;

        _logger.LogInformation("Downloaded file from MinIO: {FileKey}, bytes={Size}, contentType={ContentType}",
            fileKey, ms.Length, contentType);
        return (ms.ToArray(), contentType);
    }

    private static string GetContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream",
        };
    }
}
