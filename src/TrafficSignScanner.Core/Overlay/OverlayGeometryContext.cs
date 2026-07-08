using TrafficSignScanner.Core.Preprocessing;

namespace TrafficSignScanner.Core.Overlay;

public sealed record OverlayGeometryContext(
    int SourceWidth,
    int SourceHeight,
    CropRectangle CropRectangle,
    int DisplayWidth,
    int DisplayHeight);
