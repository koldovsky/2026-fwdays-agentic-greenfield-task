using Microsoft.ML.OnnxRuntime.Tensors;

namespace TrafficSignScanner.Core.Detection;

public static class DetectionOutputParser
{
    /// <summary>@trace FR-DETECT-02, FR-DETECT-03</summary>
    public static IReadOnlyList<Detection> Parse(
        Tensor<float> boxes,
        Tensor<long> classes,
        Tensor<float> scores,
        IReadOnlyList<string> labels,
        float confidenceThreshold = ModelContract.DefaultConfidenceThreshold)
    {
        ArgumentNullException.ThrowIfNull(boxes);
        ArgumentNullException.ThrowIfNull(classes);
        ArgumentNullException.ThrowIfNull(scores);
        ArgumentNullException.ThrowIfNull(labels);

        var detectionCount = GetDetectionCount(scores);
        var detections = new List<Detection>(detectionCount);

        for (var index = 0; index < detectionCount; index++)
        {
            var confidence = GetScore(scores, index);
            if (confidence < confidenceThreshold)
            {
                continue;
            }

            var mapping = LabelMapper.MapClassId(GetClassId(classes, index), labels);
            detections.Add(new Detection(
                ParseBox(boxes, index),
                mapping.ClassId,
                mapping.Label,
                confidence));
        }

        return detections;
    }

    private static int GetDetectionCount(Tensor<float> scores)
    {
        return scores.Dimensions.Length switch
        {
            1 => scores.Dimensions[0],
            2 => scores.Dimensions[1],
            _ => throw new InvalidOperationException("Unexpected detected_scores tensor rank."),
        };
    }

    private static float GetScore(Tensor<float> scores, int index)
    {
        return scores.Dimensions.Length switch
        {
            1 => scores[index],
            2 => scores[0, index],
            _ => throw new InvalidOperationException("Unexpected detected_scores tensor rank."),
        };
    }

    private static long GetClassId(Tensor<long> classes, int index)
    {
        return classes.Dimensions.Length switch
        {
            1 => classes[index],
            2 => classes[0, index],
            _ => throw new InvalidOperationException("Unexpected detected_classes tensor rank."),
        };
    }

    private static NormalizedBoundingBox ParseBox(Tensor<float> boxes, int index)
    {
        float xmin;
        float ymin;
        float xmax;
        float ymax;

        if (boxes.Dimensions.Length == 3)
        {
            xmin = boxes[0, index, 0];
            ymin = boxes[0, index, 1];
            xmax = boxes[0, index, 2];
            ymax = boxes[0, index, 3];
        }
        else if (boxes.Dimensions.Length == 2)
        {
            xmin = boxes[index, 0];
            ymin = boxes[index, 1];
            xmax = boxes[index, 2];
            ymax = boxes[index, 3];
        }
        else
        {
            throw new InvalidOperationException("Unexpected detected_boxes tensor rank.");
        }

        var left = Math.Min(xmin, xmax);
        var top = Math.Min(ymin, ymax);
        var width = Math.Abs(xmax - xmin);
        var height = Math.Abs(ymax - ymin);
        return new NormalizedBoundingBox(left, top, width, height);
    }
}
