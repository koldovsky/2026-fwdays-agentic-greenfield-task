using TrafficSignScanner.Core.Detection;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Analysis;

public static class DetectionStatusFormatter
{
    /// <summary>@trace FR-OVERLAY-02</summary>
    public static string FormatStatusMessage(IReadOnlyList<DetectionResult> detections)
    {
        ArgumentNullException.ThrowIfNull(detections);

        if (detections.Count == 0)
        {
            return "No supported traffic sign detected.";
        }

        return string.Join(
            "; ",
            detections.Select(detection => $"{detection.Label} ({detection.Confidence:P0})"));
    }
}
