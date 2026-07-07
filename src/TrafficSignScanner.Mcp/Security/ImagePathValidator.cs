namespace TrafficSignScanner.Mcp.Security;

public interface IImagePathValidator
{
    /// <summary>@trace FR-MCP-01</summary>
    string Validate(string imagePath);
}

public sealed class ImagePathValidator : IImagePathValidator
{
    private const long MaxFileBytes = 50 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".bmp",
    };

    public string Validate(string imagePath)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            throw new ImagePathValidationException("Image path is required.");
        }

        if (imagePath.Contains('\0', StringComparison.Ordinal))
        {
            throw new ImagePathValidationException("Image path contains invalid characters.");
        }

        string fullPath;
        try
        {
            fullPath = Path.GetFullPath(imagePath);
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            throw new ImagePathValidationException($"Image path is invalid: {ex.Message}");
        }

        if (Directory.Exists(fullPath))
        {
            throw new ImagePathValidationException("Image path is not a file.");
        }

        if (!File.Exists(fullPath))
        {
            throw new ImagePathValidationException($"Image file was not found: {fullPath}");
        }

        var extension = Path.GetExtension(fullPath);
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ImagePathValidationException($"Unsupported image extension '{extension}'.");
        }

        var fileInfo = new FileInfo(fullPath);
        if (fileInfo.Length <= 0)
        {
            throw new ImagePathValidationException("Image file is empty.");
        }

        if (fileInfo.Length > MaxFileBytes)
        {
            throw new ImagePathValidationException("Image file exceeds the maximum allowed size.");
        }

        return fullPath;
    }
}
