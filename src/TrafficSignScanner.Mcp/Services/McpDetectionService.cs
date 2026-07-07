using TrafficSignScanner.Core.Detection;
using TrafficSignScanner.Mcp.Security;

namespace TrafficSignScanner.Mcp.Services;

public sealed record DetectionResultDto(
    string Label,
    float Confidence,
    float Left,
    float Top,
    float Width,
    float Height);

public sealed record DetectObjectsResult(
    string ImagePath,
    IReadOnlyList<DetectionResultDto> Detections);

public sealed record ModelInfoResult(
    string InputName,
    int[] InputShape,
    IReadOnlyList<string> OutputNames,
    IReadOnlyList<string> Labels,
    float ConfidenceThreshold);

public interface IMcpDetectionService
{
    /// <summary>@trace FR-MCP-01</summary>
    Task<DetectObjectsResult> DetectObjectsAsync(string imagePath, CancellationToken cancellationToken = default);

    /// <summary>@trace FR-MCP-02</summary>
    ModelInfoResult GetModelInfo();
}

public sealed class McpDetectionService : IMcpDetectionService
{
    private readonly IImagePathValidator _imagePathValidator;
    private readonly IMcpDetectorProvider _detectorProvider;
    private readonly IRepositoryPaths _repositoryPaths;

    public McpDetectionService(
        IImagePathValidator imagePathValidator,
        IMcpDetectorProvider detectorProvider,
        IRepositoryPaths? repositoryPaths = null)
    {
        _imagePathValidator = imagePathValidator ?? throw new ArgumentNullException(nameof(imagePathValidator));
        _detectorProvider = detectorProvider ?? throw new ArgumentNullException(nameof(detectorProvider));
        _repositoryPaths = repositoryPaths ?? new RepositoryPaths();
    }

    public async Task<DetectObjectsResult> DetectObjectsAsync(
        string imagePath,
        CancellationToken cancellationToken = default)
    {
        var validatedPath = _imagePathValidator.Validate(imagePath);
        var imageBytes = await File.ReadAllBytesAsync(validatedPath, cancellationToken).ConfigureAwait(false);
        var detector = await _detectorProvider.GetDetectorAsync(cancellationToken).ConfigureAwait(false);
        var detections = await detector.DetectAsync(imageBytes, cancellationToken).ConfigureAwait(false);

        return new DetectObjectsResult(
            validatedPath,
            detections.Select(MapDetection).ToArray());
    }

    public ModelInfoResult GetModelInfo()
    {
        var labels = LoadLabelsFromDisk();
        return new ModelInfoResult(
            ModelContract.InputName,
            [1, 3, 320, 320],
            [ModelContract.BoxesOutputName, ModelContract.ClassesOutputName, ModelContract.ScoresOutputName],
            labels,
            ModelContract.DefaultConfidenceThreshold);
    }

    private IReadOnlyList<string> LoadLabelsFromDisk()
    {
        if (!File.Exists(_repositoryPaths.LabelsPath))
        {
            throw new InvalidOperationException(
                $"Bundled labels file was not found at '{_repositoryPaths.LabelsPath}'.");
        }

        return File.ReadAllLines(_repositoryPaths.LabelsPath)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToArray();
    }

    private static DetectionResultDto MapDetection(Detection detection)
    {
        return new DetectionResultDto(
            detection.Label,
            detection.Confidence,
            detection.Box.Left,
            detection.Box.Top,
            detection.Box.Width,
            detection.Box.Height);
    }
}
