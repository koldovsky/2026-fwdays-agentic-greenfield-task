using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Core.Tests.Detection;

public sealed class ModelAssetCopierTests
{
    /// <summary>@trace FR-DETECT-01</summary>
    [Fact]
    public void EnsureModelFile_CopiesWhenDestinationMissing()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempRoot);

        try
        {
            var sourcePath = Path.Combine(tempRoot, "source.onnx");
            var destinationPath = Path.Combine(tempRoot, "app-data", "model.onnx");
            File.WriteAllBytes(sourcePath, [0x01, 0x02, 0x03]);

            var resolvedPath = ModelAssetCopier.EnsureModelFile(sourcePath, destinationPath);

            Assert.Equal(destinationPath, resolvedPath);
            Assert.True(File.Exists(destinationPath));
            Assert.Equal(File.ReadAllBytes(sourcePath), File.ReadAllBytes(destinationPath));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }
}
