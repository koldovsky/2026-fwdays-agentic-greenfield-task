namespace TrafficSignScanner.Services;

public interface IDetectorProvider
{
    /// <summary>@trace NFR-STARTUP-01</summary>
    Task<TrafficSignScanner.Core.Detection.IDetector> GetDetectorAsync(
        CancellationToken cancellationToken = default);
}
