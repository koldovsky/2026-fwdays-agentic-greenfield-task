using SkiaSharp;
using TrafficSignScanner.Core.Analysis;
using TrafficSignScanner.Core.Detection;
using DetectionResult = TrafficSignScanner.Core.Detection.Detection;

namespace TrafficSignScanner.Core.Tests.Analysis;

public sealed class ImageAnalysisPipelineTests
{
    /// <summary>@trace FR-OVERLAY-02</summary>
    [Fact]
    public async Task AnalyzeAsync_ReturnsAnnotatedPngBytes()
    {
        var encodedImage = CreateSolidPng(width: 640, height: 480, fill: SKColors.White);
        var detector = new FakeDetector(
        [
            new DetectionResult(
                new NormalizedBoundingBox(0.2f, 0.2f, 0.5f, 0.5f),
                2,
                "stop-sign",
                0.92f),
        ]);

        var result = await ImageAnalysisPipeline.AnalyzeAsync(
            detector,
            encodedImage,
            displayWidth: 320,
            displayHeight: 240);

        Assert.NotEmpty(result.AnnotatedPreviewPng);
        Assert.Equal(PngSignature, result.AnnotatedPreviewPng.AsSpan(0, PngSignature.Length));
        Assert.Single(result.Detections);
    }

    /// <summary>@trace FR-OVERLAY-02</summary>
    [Fact]
    public async Task AnalyzeAsync_WhenNoDetections_StillReturnsSourcePreviewPng()
    {
        var encodedImage = CreateSolidPng(width: 400, height: 400, fill: SKColors.Gray);
        var detector = new FakeDetector([]);

        var result = await ImageAnalysisPipeline.AnalyzeAsync(
            detector,
            encodedImage,
            displayWidth: 0,
            displayHeight: 0);

        Assert.NotEmpty(result.AnnotatedPreviewPng);
        Assert.Empty(result.Detections);
    }

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static byte[] CreateSolidPng(int width, int height, SKColor fill)
    {
        using var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(fill);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private sealed class FakeDetector(IReadOnlyList<DetectionResult> detections) : IDetector
    {
        public Task<IReadOnlyList<DetectionResult>> DetectAsync(
            ReadOnlyMemory<byte> encodedImageBytes,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(detections);
        }
    }
}
