using SkiaSharp;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Overlay;

public static class AnnotatedImageRenderer
{
    private const float BoxStrokeWidth = 3f;
    private const float LabelTextSize = 18f;

    /// <summary>@trace FR-OVERLAY-01</summary>
    public static SKBitmap Render(
        SKBitmap source,
        IReadOnlyList<OverlayGeometry> overlays,
        OverlayGeometryContext context)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(overlays);
        ArgumentNullException.ThrowIfNull(context);

        var annotated = new SKBitmap(context.DisplayWidth, context.DisplayHeight, SKColorType.Rgba8888, SKAlphaType.Premul);
        using var canvas = new SKCanvas(annotated);
        canvas.Clear(SKColors.Black);

        var destination = new SKRect(0, 0, context.DisplayWidth, context.DisplayHeight);
        canvas.DrawBitmap(source, destination, SKSamplingOptions.Default);

        using var boxPaint = new SKPaint
        {
            Color = SKColors.Lime,
            IsAntialias = true,
            Style = SKPaintStyle.Stroke,
            StrokeWidth = BoxStrokeWidth,
        };

        using var labelPaint = new SKPaint
        {
            Color = SKColors.Yellow,
            IsAntialias = true,
        };

        using var labelFont = new SKFont(SKTypeface.Default, LabelTextSize);

        foreach (var overlay in overlays)
        {
            var rect = overlay.DisplayBox;
            canvas.DrawRect(rect.Left, rect.Top, rect.Width, rect.Height, boxPaint);
            canvas.DrawText(
                $"{overlay.Label} {overlay.Confidence:P0}",
                rect.Left,
                Math.Max(LabelTextSize, rect.Top - 4),
                SKTextAlign.Left,
                labelFont,
                labelPaint);
        }

        canvas.Flush();
        return annotated;
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    public static SKBitmap RenderFromDetections(
        SKBitmap source,
        IReadOnlyList<DetectionResult> detections,
        OverlayGeometryContext context)
    {
        var overlays = OverlayCoordinateConverter.ConvertDetections(detections, context);
        return Render(source, overlays, context);
    }
}
