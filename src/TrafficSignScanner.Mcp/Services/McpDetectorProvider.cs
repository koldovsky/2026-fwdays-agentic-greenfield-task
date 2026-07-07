using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Mcp.Services;

public interface IMcpDetectorProvider
{
    /// <summary>@trace FR-MCP-01</summary>
    Task<IDetector> GetDetectorAsync(CancellationToken cancellationToken = default);
}

public sealed class McpDetectorProvider : IMcpDetectorProvider, IDisposable
{
    private readonly IRepositoryPaths _repositoryPaths;
    private readonly SemaphoreSlim _initializationGate = new(1, 1);
    private IDetector? _detector;

    public McpDetectorProvider(IRepositoryPaths repositoryPaths)
    {
        _repositoryPaths = repositoryPaths ?? throw new ArgumentNullException(nameof(repositoryPaths));
    }

    public async Task<IDetector> GetDetectorAsync(CancellationToken cancellationToken = default)
    {
        if (_detector is not null)
        {
            return _detector;
        }

        await _initializationGate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_detector is not null)
            {
                return _detector;
            }

            if (!File.Exists(_repositoryPaths.ModelPath))
            {
                throw new InvalidOperationException(
                    $"Bundled ONNX model was not found at '{_repositoryPaths.ModelPath}'.");
            }

            var labels = await LoadLabelsAsync(cancellationToken).ConfigureAwait(false);
            _detector = new TrafficSignDetector(_repositoryPaths.ModelPath, labels);
            return _detector;
        }
        finally
        {
            _initializationGate.Release();
        }
    }

    public void Dispose()
    {
        if (_detector is IDisposable disposable)
        {
            disposable.Dispose();
        }

        _initializationGate.Dispose();
    }

    private async Task<IReadOnlyList<string>> LoadLabelsAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_repositoryPaths.LabelsPath))
        {
            throw new InvalidOperationException(
                $"Bundled labels file was not found at '{_repositoryPaths.LabelsPath}'.");
        }

        var labels = new List<string>();
        using var reader = new StreamReader(_repositoryPaths.LabelsPath);
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(cancellationToken).ConfigureAwait(false);
            if (line is null)
            {
                break;
            }

            if (!string.IsNullOrWhiteSpace(line))
            {
                labels.Add(line.Trim());
            }
        }

        return labels;
    }
}
