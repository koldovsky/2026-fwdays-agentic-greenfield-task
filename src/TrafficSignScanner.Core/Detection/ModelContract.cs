namespace TrafficSignScanner.Core.Detection;

public static class ModelContract
{
    public const string InputName = "image_tensor";
    public const string BoxesOutputName = "detected_boxes";
    public const string ClassesOutputName = "detected_classes";
    public const string ScoresOutputName = "detected_scores";
    public const float DefaultConfidenceThreshold = 0.5f;
}
