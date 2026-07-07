using SkiaSharp;
using TrafficSignScanner.Core.Detection;
using TrafficSignScanner.Core.Overlay;
using TrafficSignScanner.Core.Preprocessing;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Tests.Overlay;

public sealed class AnnotatedImageRendererTests
{
    /// <summary>@trace FR-OVERLAY-01</summary>
    [Fact]
    public void Render_DrawsBoundingBoxAndLabelOnDisplayBitmap()
    {
        using var source = CreateSolidBitmap(width: 800, height: 600, fill: SKColors.White);
        var overlays = new[]
        {
            new OverlayGeometry(
                new DisplayRectangle(80, 60, 120, 150),
                "stop-sign",
                0.92f),
        };
        var context = new OverlayGeometryContext(800, 600, new CropRectangle(100, 0, 600), 400, 300);

        using var annotated = AnnotatedImageRenderer.Render(source, overlays, context);

        Assert.Equal(400, annotated.Width);
        Assert.Equal(300, annotated.Height);
        Assert.NotEqual(SKColors.White, annotated.GetPixel(80, 60));
        Assert.NotEqual(SKColors.White, annotated.GetPixel(199, 209));
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    [Fact]
    public void RenderFromDetections_ConvertsCoordinatesAndDrawsOverlay()
    {
        using var source = CreateSolidBitmap(width: 800, height: 600, fill: SKColors.White);
        var detections = new[]
        {
            new DetectionResult(
                new NormalizedBoundingBox(0.1f, 0.2f, 0.4f, 0.5f),
                2,
                "stop-sign",
                0.92f),
        };
        var context = new OverlayGeometryContext(800, 600, new CropRectangle(100, 0, 600), 400, 300);

        using var annotated = AnnotatedImageRenderer.RenderFromDetections(source, detections, context);

        Assert.Equal(400, annotated.Width);
        Assert.NotEqual(SKColors.White, annotated.GetPixel(80, 60));
    }

    private static SKBitmap CreateSolidBitmap(int width, int height, SKColor fill)
    {
        var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(fill);
        return bitmap;
    }
}
