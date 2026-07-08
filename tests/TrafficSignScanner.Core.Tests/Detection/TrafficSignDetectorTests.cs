using Microsoft.ML.OnnxRuntime.Tensors;
using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Core.Tests.Detection;

public sealed class TrafficSignDetectorTests
{
    private static readonly string[] Labels = ["no-entry", "parking-prohibited", "stop-sign"];

    /// <summary>@trace FR-DETECT-01, FR-DETECT-02, FR-DETECT-03</summary>
    [Fact]
    public async Task DetectAsync_WiresPreprocessedTensorToInferenceEngine()
    {
        var fakeEngine = new FakeOnnxInferenceEngine
        {
            Output = new OnnxInferenceOutput(
                CreateBoxes([0.1f, 0.2f, 0.5f, 0.6f]),
                CreateClasses([2]),
                CreateScores([0.96f])),
        };

        using var detector = new TrafficSignDetector(fakeEngine, Labels, ModelContract.DefaultConfidenceThreshold, ownsEngine: false);
        var pngBytes = CreateSolidPng(width: 640, height: 480, red: 255, green: 0, blue: 0);

        var detections = await detector.DetectAsync(pngBytes);

        Assert.NotNull(fakeEngine.InputTensor);
        Assert.Equal(new[] { 1, 3, 320, 320 }, fakeEngine.InputTensor!.Dimensions.ToArray());
        Assert.Single(detections);
        Assert.Equal("stop-sign", detections[0].Label);
        Assert.Equal(0.96f, detections[0].Confidence);
    }

    private static DenseTensor<float> CreateBoxes(float[] values) =>
        new(values, [1, values.Length / 4, 4]);

    private static DenseTensor<long> CreateClasses(long[] values) =>
        new(values, [1, values.Length]);

    private static DenseTensor<float> CreateScores(float[] values) =>
        new(values, [1, values.Length]);

    private static byte[] CreateSolidPng(int width, int height, byte red, byte green, byte blue)
    {
        using var bitmap = new SkiaSharp.SKBitmap(width, height, SkiaSharp.SKColorType.Rgba8888, SkiaSharp.SKAlphaType.Premul);
        bitmap.Erase(new SkiaSharp.SKColor(red, green, blue));
        using var image = SkiaSharp.SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SkiaSharp.SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private sealed class FakeOnnxInferenceEngine : IOnnxInferenceEngine
    {
        public DenseTensor<float>? InputTensor { get; private set; }

        public OnnxInferenceOutput Output { get; set; } =
            new(new DenseTensor<float>([1, 1, 4]), new DenseTensor<long>([1, 1]), new DenseTensor<float>([1, 1]));

        public OnnxInferenceOutput Run(DenseTensor<float> inputTensor)
        {
            InputTensor = inputTensor;
            return Output;
        }
    }
}
