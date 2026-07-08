using TrafficSignScanner.Mcp.Security;
using TrafficSignScanner.Mcp.Services;

namespace TrafficSignScanner.Mcp.Tests;

public sealed class McpDetectionServiceTests
{
    /// <summary>@trace FR-MCP-02</summary>
    [Fact]
    public void GetModelInfo_ReturnsContractMetadata()
    {
        var service = CreateService();

        var info = service.GetModelInfo();

        Assert.Equal("image_tensor", info.InputName);
        Assert.Equal([1, 3, 320, 320], info.InputShape);
        Assert.Equal(["detected_boxes", "detected_classes", "detected_scores"], info.OutputNames);
        Assert.Equal(["no-entry", "parking-prohibited", "stop-sign"], info.Labels);
        Assert.Equal(0.5f, info.ConfidenceThreshold);
    }

    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public async Task DetectObjectsAsync_WhenPathInvalid_DoesNotRunInference()
    {
        var service = CreateService();

        await Assert.ThrowsAsync<ImagePathValidationException>(
            () => service.DetectObjectsAsync(@"C:\missing-image.jpg", CancellationToken.None));
    }

    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public async Task DetectObjectsAsync_WithEvalSampleImage_ReturnsStructuredDetections()
    {
        var repoRoot = RepositoryPaths.FindRepoRoot();
        var samplePath = Path.Combine(repoRoot, "evals", "dataset", "stop-sign", "stop-sign-01.jpg");
        Assert.True(File.Exists(samplePath), $"Sample eval image is required: {samplePath}");

        var service = CreateService();

        var result = await service.DetectObjectsAsync(samplePath, CancellationToken.None);

        Assert.Equal(Path.GetFullPath(samplePath), result.ImagePath);
        Assert.NotEmpty(result.Detections);
        Assert.Contains(result.Detections, detection => detection.Label == "stop-sign");
    }

    private static McpDetectionService CreateService()
    {
        var repositoryPaths = new RepositoryPaths();
        return new McpDetectionService(
            new ImagePathValidator(),
            new McpDetectorProvider(repositoryPaths),
            repositoryPaths);
    }
}
