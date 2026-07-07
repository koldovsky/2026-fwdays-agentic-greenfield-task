namespace TrafficSignScanner.Core.Preprocessing;

public static class CenterCropCalculator
{
    /// <summary>@trace FR-PREPROC-01</summary>
    public static CropRectangle Calculate(int sourceWidth, int sourceHeight)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sourceWidth);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sourceHeight);

        var size = Math.Min(sourceWidth, sourceHeight);
        var x = (sourceWidth - size) / 2;
        var y = (sourceHeight - size) / 2;
        return new CropRectangle(x, y, size);
    }
}
