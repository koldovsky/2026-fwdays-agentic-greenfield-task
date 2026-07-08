using TrafficSignScanner.Core.Analysis;
using TrafficSignScanner.Core.Detection;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Tests.Analysis;

public sealed class DetectionStatusFormatterTests
{
    /// <summary>@trace FR-OVERLAY-02</summary>
    [Fact]
    public void FormatStatusMessage_WhenNoDetections_ReturnsEmptyStateMessage()
    {
        IReadOnlyList<DetectionResult> detections = Array.Empty<DetectionResult>();

        var message = DetectionStatusFormatter.FormatStatusMessage(detections);

        Assert.Equal("No supported traffic sign detected.", message);
    }

    /// <summary>@trace FR-OVERLAY-02</summary>
    [Fact]
    public void FormatStatusMessage_WhenDetectionsPresent_IncludesLabelAndConfidence()
    {
        IReadOnlyList<DetectionResult> detections =
        [
            new DetectionResult(
                new NormalizedBoundingBox(0.1f, 0.2f, 0.3f, 0.4f),
                2,
                "stop-sign",
                0.92f),
        ];

        var message = DetectionStatusFormatter.FormatStatusMessage(detections);

        Assert.Contains("stop-sign", message, StringComparison.Ordinal);
        Assert.Contains("92", message, StringComparison.Ordinal);
    }
}
