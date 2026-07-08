using TrafficSignScanner.Mcp.Security;
using TrafficSignScanner.Mcp.Services;

namespace TrafficSignScanner.Mcp.Tests;

public sealed class ImagePathValidatorTests
{
    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public void Validate_WhenPathMissing_ThrowsBeforeInference()
    {
        var validator = new ImagePathValidator();

        var exception = Assert.Throws<ImagePathValidationException>(
            () => validator.Validate(@"C:\does-not-exist\missing.jpg"));

        Assert.Contains("not found", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public void Validate_WhenPathIsDirectory_ThrowsBeforeInference()
    {
        var validator = new ImagePathValidator();
        var repoRoot = RepositoryPaths.FindRepoRoot();

        var exception = Assert.Throws<ImagePathValidationException>(
            () => validator.Validate(repoRoot));

        Assert.Contains("not a file", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public void Validate_WhenExtensionNotAllowed_ThrowsBeforeInference()
    {
        var validator = new ImagePathValidator();
        var repoRoot = RepositoryPaths.FindRepoRoot();
        var readmePath = Path.Combine(repoRoot, "README.md");

        var exception = Assert.Throws<ImagePathValidationException>(
            () => validator.Validate(readmePath));

        Assert.Contains("extension", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>@trace FR-MCP-01</summary>
    [Fact]
    public void Validate_WhenEvalImageExists_ReturnsFullPath()
    {
        var validator = new ImagePathValidator();
        var repoRoot = RepositoryPaths.FindRepoRoot();
        var samplePath = Path.Combine(repoRoot, "evals", "dataset", "stop-sign", "stop-sign-01.jpg");
        Assert.True(File.Exists(samplePath), $"Sample eval image is required: {samplePath}");

        var validatedPath = validator.Validate(samplePath);

        Assert.Equal(Path.GetFullPath(samplePath), validatedPath);
    }
}
