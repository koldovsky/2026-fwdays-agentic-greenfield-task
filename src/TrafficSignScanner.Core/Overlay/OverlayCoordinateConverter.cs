using TrafficSignScanner.Core.Detection;
using TrafficSignScanner.Core.Preprocessing;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Overlay;

public static class OverlayCoordinateConverter
{
    /// <summary>@trace FR-OVERLAY-01</summary>
    public static DisplayRectangle ToSourceCoordinates(NormalizedBoundingBox modelBox, CropRectangle crop)
    {
        return new DisplayRectangle(
            crop.X + (modelBox.Left * crop.Size),
            crop.Y + (modelBox.Top * crop.Size),
            modelBox.Width * crop.Size,
            modelBox.Height * crop.Size);
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    public static DisplayRectangle ToDisplayCoordinates(DisplayRectangle sourceBox, OverlayGeometryContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(context.SourceWidth);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(context.SourceHeight);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(context.DisplayWidth);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(context.DisplayHeight);

        var scaleX = context.DisplayWidth / (float)context.SourceWidth;
        var scaleY = context.DisplayHeight / (float)context.SourceHeight;

        return new DisplayRectangle(
            sourceBox.Left * scaleX,
            sourceBox.Top * scaleY,
            sourceBox.Width * scaleX,
            sourceBox.Height * scaleY);
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    public static OverlayGeometry ConvertDetection(DetectionResult detection, OverlayGeometryContext context)
    {
        ArgumentNullException.ThrowIfNull(detection);
        ArgumentNullException.ThrowIfNull(context);

        var sourceBox = ToSourceCoordinates(detection.Box, context.CropRectangle);
        var displayBox = ToDisplayCoordinates(sourceBox, context);
        return new OverlayGeometry(displayBox, detection.Label, detection.Confidence);
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    public static IReadOnlyList<OverlayGeometry> ConvertDetections(
        IReadOnlyList<DetectionResult> detections,
        OverlayGeometryContext context)
    {
        ArgumentNullException.ThrowIfNull(detections);
        ArgumentNullException.ThrowIfNull(context);

        return detections.Select(detection => ConvertDetection(detection, context)).ToArray();
    }
}
