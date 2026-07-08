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
    internal const int DefaultMaxPreviewEdge = 1280;

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
        var (resolvedDisplayWidth, resolvedDisplayHeight) = ResolvePreviewDimensions(
            source.Width,
            source.Height,
            displayWidth,
            displayHeight);
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

    internal static (int Width, int Height) ResolvePreviewDimensions(
        int sourceWidth,
        int sourceHeight,
        int displayWidth,
        int displayHeight)
    {
        if (displayWidth > 0 && displayHeight > 0)
        {
            return (displayWidth, displayHeight);
        }

        var maxEdge = Math.Max(sourceWidth, sourceHeight);
        if (maxEdge <= DefaultMaxPreviewEdge)
        {
            return (sourceWidth, sourceHeight);
        }

        var scale = DefaultMaxPreviewEdge / (float)maxEdge;
        return (
            Math.Max(1, (int)Math.Round(sourceWidth * scale)),
            Math.Max(1, (int)Math.Round(sourceHeight * scale)));
    }

    private static byte[] EncodePng(SKBitmap bitmap)
    {
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100)
            ?? throw new InvalidOperationException("Failed to encode annotated preview PNG.");

        return data.ToArray();
    }
}
