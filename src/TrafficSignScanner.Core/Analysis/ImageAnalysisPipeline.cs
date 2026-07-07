using SkiaSharp;
using TrafficSignScanner.Core.Detection;
using TrafficSignScanner.Core.Overlay;
using TrafficSignScanner.Core.Preprocessing;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Analysis;

public sealed record ImageAnalysisResult(
    IReadOnlyList<DetectionResult> Detections,
    byte[] AnnotatedPreviewPng);

public static class ImageAnalysisPipeline
{
    /// <summary>@trace FR-OVERLAY-01, FR-OVERLAY-02</summary>
    public static async Task<ImageAnalysisResult> AnalyzeAsync(
        IDetector detector,
        ReadOnlyMemory<byte> encodedImageBytes,
        int displayWidth,
        int displayHeight,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(detector);

        var detections = await detector.DetectAsync(encodedImageBytes, cancellationToken).ConfigureAwait(false);

        using var source = ImagePreprocessor.DecodeSourceImage(encodedImageBytes.Span);
        var crop = CenterCropCalculator.Calculate(source.Width, source.Height);
        var resolvedDisplayWidth = displayWidth > 0 ? displayWidth : source.Width;
        var resolvedDisplayHeight = displayHeight > 0 ? displayHeight : source.Height;
        var context = new OverlayGeometryContext(
            source.Width,
            source.Height,
            crop,
            resolvedDisplayWidth,
            resolvedDisplayHeight);

        using var annotated = AnnotatedImageRenderer.RenderFromDetections(source, detections, context);
        var pngBytes = EncodePng(annotated);
        return new ImageAnalysisResult(detections, pngBytes);
    }

    private static byte[] EncodePng(SKBitmap bitmap)
    {
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
