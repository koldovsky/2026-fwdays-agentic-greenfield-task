namespace TrafficSignScanner.Core.Detection;

public static class ModelAssetCopier
{
    /// <summary>@trace FR-DETECT-01</summary>
    public static string EnsureModelFile(string sourcePath, string destinationPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourcePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        if (!File.Exists(sourcePath))
        {
            throw new FileNotFoundException("Bundled ONNX model was not found.", sourcePath);
        }

        var destinationDirectory = Path.GetDirectoryName(destinationPath);
        if (!string.IsNullOrWhiteSpace(destinationDirectory))
        {
            Directory.CreateDirectory(destinationDirectory);
        }

        if (!File.Exists(destinationPath)
            || File.GetLastWriteTimeUtc(sourcePath) > File.GetLastWriteTimeUtc(destinationPath))
        {
            File.Copy(sourcePath, destinationPath, overwrite: true);
        }

        return destinationPath;
    }

    /// <summary>@trace FR-DETECT-01</summary>
    public static string EnsureModelFile(Stream sourceStream, string destinationPath)
    {
        ArgumentNullException.ThrowIfNull(sourceStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        var destinationDirectory = Path.GetDirectoryName(destinationPath);
        if (!string.IsNullOrWhiteSpace(destinationDirectory))
        {
            Directory.CreateDirectory(destinationDirectory);
        }

        if (sourceStream.CanSeek)
        {
            sourceStream.Position = 0;
        }

        using var destinationStream = File.Create(destinationPath);
        sourceStream.CopyTo(destinationStream);
        return destinationPath;
    }
}
