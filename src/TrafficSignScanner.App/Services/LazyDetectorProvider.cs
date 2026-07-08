using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Services;

public sealed class LazyDetectorProvider : IDetectorProvider, IDisposable
{
    private readonly IModelAssetService _modelAssetService;
    private readonly SemaphoreSlim _initializationGate = new(1, 1);
    private IDetector? _detector;

    public LazyDetectorProvider(IModelAssetService modelAssetService)
    {
        _modelAssetService = modelAssetService ?? throw new ArgumentNullException(nameof(modelAssetService));
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

            var modelPath = await _modelAssetService.EnsureModelPathAsync(cancellationToken).ConfigureAwait(false);
            var labels = await _modelAssetService.LoadLabelsAsync(cancellationToken).ConfigureAwait(false);
            _detector = new TrafficSignDetector(modelPath, labels);
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
}
