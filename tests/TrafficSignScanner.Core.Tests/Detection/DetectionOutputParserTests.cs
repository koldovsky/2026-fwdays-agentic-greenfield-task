using Microsoft.ML.OnnxRuntime.Tensors;
using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Core.Tests.Detection;

public sealed class DetectionOutputParserTests
{
    private static readonly string[] Labels = ["no-entry", "parking-prohibited", "stop-sign"];

    /// <summary>@trace FR-DETECT-02</summary>
    [Fact]
    public void Parse_OutputTensorsBecomeTypedDetections()
    {
        var boxes = CreateBoxes([0.1f, 0.2f, 0.5f, 0.6f]);
        var classes = CreateClasses([2]);
        var scores = CreateScores([0.92f]);

        var detections = DetectionOutputParser.Parse(boxes, classes, scores, Labels);

        Assert.Single(detections);
        Assert.Equal("stop-sign", detections[0].Label);
        Assert.Equal(2, detections[0].ClassId);
        Assert.Equal(0.92f, detections[0].Confidence);
        Assert.Equal(0.1f, detections[0].Box.Left);
        Assert.Equal(0.2f, detections[0].Box.Top);
        Assert.Equal(0.4f, detections[0].Box.Width, precision: 3);
        Assert.Equal(0.4f, detections[0].Box.Height, precision: 3);
    }

    /// <summary>@trace FR-DETECT-03</summary>
    [Fact]
    public void Parse_IgnoresDetectionsBelowThreshold()
    {
        var boxes = CreateBoxes([0.1f, 0.2f, 0.5f, 0.6f, 0.2f, 0.2f, 0.4f, 0.4f]);
        var classes = CreateClasses([2, 1]);
        var scores = CreateScores([0.92f, 0.18f]);

        var detections = DetectionOutputParser.Parse(boxes, classes, scores, Labels, confidenceThreshold: 0.5f);

        Assert.Single(detections);
        Assert.Equal("stop-sign", detections[0].Label);
    }

    private static DenseTensor<float> CreateBoxes(float[] values) =>
        new(values, [1, values.Length / 4, 4]);

    private static DenseTensor<long> CreateClasses(long[] values) =>
        new(values, [1, values.Length]);

    private static DenseTensor<float> CreateScores(float[] values) =>
        new(values, [1, values.Length]);
}
