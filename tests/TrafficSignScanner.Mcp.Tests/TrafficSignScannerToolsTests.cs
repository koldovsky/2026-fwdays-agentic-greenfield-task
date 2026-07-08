using TrafficSignScanner.Mcp.Security;
using TrafficSignScanner.Mcp.Services;
using TrafficSignScanner.Mcp.Tools;

namespace TrafficSignScanner.Mcp.Tests;

public sealed class TrafficSignScannerToolsTests
{
    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public async Task DetectObjectsTool_ReturnsJsonDetectionsForEvalSample()
    {
        var repoRoot = RepositoryPaths.FindRepoRoot();
        var samplePath = Path.Combine(repoRoot, "evals", "dataset", "stop-sign", "stop-sign-01.jpg");
        Assert.True(File.Exists(samplePath), $"Sample eval image is required: {samplePath}");

        var tools = CreateTools();

        var json = await tools.DetectObjectsAsync(samplePath, CancellationToken.None);

        Assert.Contains("stop-sign", json, StringComparison.Ordinal);
        Assert.Contains("detections", json, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>@trace FR-MCP-02</summary>
    [Fact]
    public void GetModelInfoTool_ReturnsContractJson()
    {
        var tools = CreateTools();

        var json = tools.GetModelInfo();

        Assert.Contains("image_tensor", json, StringComparison.Ordinal);
        Assert.Contains("detected_boxes", json, StringComparison.Ordinal);
        Assert.Contains("no-entry", json, StringComparison.Ordinal);
    }

    private static TrafficSignScannerTools CreateTools()
    {
        var repositoryPaths = new RepositoryPaths();
        var service = new McpDetectionService(
            new ImagePathValidator(),
            new McpDetectorProvider(repositoryPaths),
            repositoryPaths);

        return new TrafficSignScannerTools(service);
    }
}
