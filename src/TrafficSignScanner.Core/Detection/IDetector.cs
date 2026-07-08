namespace TrafficSignScanner.Core.Detection;

public interface IDetector
{
    /// <summary>@trace FR-DETECT-01, FR-DETECT-02, FR-DETECT-03</summary>
    Task<IReadOnlyList<Detection>> DetectAsync(
        ReadOnlyMemory<byte> encodedImageBytes,
        CancellationToken cancellationToken = default);
}
