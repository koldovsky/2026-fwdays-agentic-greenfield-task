namespace TrafficSignScanner.Core.Overlay;

public sealed record OverlayGeometry(
    DisplayRectangle DisplayBox,
    string Label,
    float Confidence);
