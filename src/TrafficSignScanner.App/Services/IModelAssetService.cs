namespace TrafficSignScanner.Services;

public interface IModelAssetService
{
    /// <summary>@trace FR-DETECT-01, NFR-STARTUP-01</summary>
    Task<string> EnsureModelPathAsync(CancellationToken cancellationToken = default);

    /// <summary>@trace FR-DETECT-01</summary>
    Task<IReadOnlyList<string>> LoadLabelsAsync(CancellationToken cancellationToken = default);
}
