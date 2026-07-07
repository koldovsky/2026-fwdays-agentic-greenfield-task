using TrafficSignScanner.Core.Detection;
using TrafficSignScanner.Core.Overlay;
using TrafficSignScanner.Core.Preprocessing;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Tests.Overlay;

public sealed class OverlayCoordinateConverterTests
{
    /// <summary>@trace FR-OVERLAY-01</summary>
    [Fact]
    public void ToSourceCoordinates_MapsNormalizedModelBoxThroughCrop()
    {
        var modelBox = new NormalizedBoundingBox(Left: 0.1f, Top: 0.2f, Width: 0.4f, Height: 0.5f);
        var crop = new CropRectangle(X: 100, Y: 0, Size: 600);

        var sourceBox = OverlayCoordinateConverter.ToSourceCoordinates(modelBox, crop);

        Assert.Equal(160f, sourceBox.Left, precision: 3);
        Assert.Equal(120f, sourceBox.Top, precision: 3);
        Assert.Equal(240f, sourceBox.Width, precision: 3);
        Assert.Equal(300f, sourceBox.Height, precision: 3);
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    [Fact]
    public void ToDisplayCoordinates_ScalesSourceBoxToPreviewSize()
    {
        var context = new OverlayGeometryContext(
            SourceWidth: 800,
            SourceHeight: 600,
            CropRectangle: new CropRectangle(100, 0, 600),
            DisplayWidth: 400,
            DisplayHeight: 300);
        var sourceBox = new DisplayRectangle(Left: 160, Top: 120, Width: 240, Height: 300);

        var displayBox = OverlayCoordinateConverter.ToDisplayCoordinates(sourceBox, context);

        Assert.Equal(80f, displayBox.Left, precision: 3);
        Assert.Equal(60f, displayBox.Top, precision: 3);
        Assert.Equal(120f, displayBox.Width, precision: 3);
        Assert.Equal(150f, displayBox.Height, precision: 3);
    }

    /// <summary>@trace FR-OVERLAY-01</summary>
    [Fact]
    public void ConvertDetection_ProducesDisplayGeometry()
    {
        var detection = new DetectionResult(
            new NormalizedBoundingBox(0.1f, 0.2f, 0.4f, 0.5f),
            ClassId: 2,
            Label: "stop-sign",
            Confidence: 0.92f);
        var context = new OverlayGeometryContext(800, 600, new CropRectangle(100, 0, 600), 400, 300);

        var overlay = OverlayCoordinateConverter.ConvertDetection(detection, context);

        Assert.Equal("stop-sign", overlay.Label);
        Assert.Equal(0.92f, overlay.Confidence);
        Assert.Equal(80f, overlay.DisplayBox.Left, precision: 3);
        Assert.Equal(60f, overlay.DisplayBox.Top, precision: 3);
    }
}
