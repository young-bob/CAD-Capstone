using VSMS.Abstractions.Services;

namespace VSMS.Api.Features.Files;

public static class FileEndpoints
{
    public static void MapFileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/files").WithTags("Files").RequireAuthorization();

        // Upload a file (multipart form-data)
        group.MapPost("/upload", async (HttpRequest request, IFileStorageService storage) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest("Expected multipart form-data");

            var form = await request.ReadFormAsync();
            var file = form.Files.FirstOrDefault();
            if (file is null || file.Length == 0)
                return Results.BadRequest("No file provided");

            var folder = form["folder"].FirstOrDefault() ?? "uploads";

            await using var stream = file.OpenReadStream();
            var fileKey = await storage.UploadAsync(stream, file.FileName, folder);

            return Results.Ok(new { fileKey });
        }).DisableAntiforgery();

        // Get a presigned download URL
        group.MapGet("/url/{*fileKey}", async (string fileKey, IFileStorageService storage) =>
        {
            var url = await storage.GetUrlAsync(fileKey);
            return Results.Ok(new { url });
        });

        // Download file content through API (avoids exposing internal storage endpoint to web clients)
        group.MapGet("/download/{*fileKey}", async (string fileKey, HttpResponse response, IFileStorageService storage) =>
        {
            var normalizedKey = Uri.UnescapeDataString(fileKey).TrimStart('/');
            var (content, contentType) = await storage.DownloadAsync(normalizedKey);
            response.Headers["Cache-Control"] = "no-store";
            response.Headers["X-Content-Type-Options"] = "nosniff";
            return Results.File(content, contentType, enableRangeProcessing: true);
        });

        // Delete a file
        group.MapDelete("/{*fileKey}", async (string fileKey, IFileStorageService storage) =>
        {
            await storage.DeleteAsync(fileKey);
            return Results.NoContent();
        });
    }
}
