namespace TrafficSignScanner.Core.Detection;

public sealed record Detection(
    NormalizedBoundingBox Box,
    int ClassId,
    string Label,
    float Confidence);
