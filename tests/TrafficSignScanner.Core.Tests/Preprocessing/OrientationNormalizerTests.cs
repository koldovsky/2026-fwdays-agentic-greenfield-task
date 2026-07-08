using SkiaSharp;
using TrafficSignScanner.Core.Preprocessing;

namespace TrafficSignScanner.Core.Tests.Preprocessing;

public sealed class OrientationNormalizerTests
{
    /// <summary>@trace FR-PREPROC-01</summary>
    [Fact]
    public void Normalize_RightTop_SwapsDimensionsAndPreservesMarkerPixel()
    {
        using var stored = CreateBitmap(width: 200, height: 100, fill: SKColors.Blue);
        stored.SetPixel(150, 50, new SKColor(255, 0, 0));

        using var normalized = OrientationNormalizer.Normalize(stored, SKEncodedOrigin.RightTop);

        Assert.Equal(100, normalized.Width);
        Assert.Equal(200, normalized.Height);
        Assert.True(ContainsPixel(normalized, new SKColor(255, 0, 0)));
    }

    /// <summary>@trace FR-PREPROC-01</summary>
    [Fact]
    public void Normalize_TopLeft_ReturnsCopyWithSameDimensions()
    {
        using var stored = CreateBitmap(width: 120, height: 80, fill: SKColors.Green);

        using var normalized = OrientationNormalizer.Normalize(stored, SKEncodedOrigin.TopLeft);

        Assert.Equal(stored.Width, normalized.Width);
        Assert.Equal(stored.Height, normalized.Height);
        Assert.Equal(stored.GetPixel(10, 10), normalized.GetPixel(10, 10));
    }

    private static SKBitmap CreateBitmap(int width, int height, SKColor fill)
    {
        var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(fill);
        return bitmap;
    }

    private static bool ContainsPixel(SKBitmap bitmap, SKColor expected)
    {
        for (var y = 0; y < bitmap.Height; y++)
        {
            for (var x = 0; x < bitmap.Width; x++)
            {
                if (bitmap.GetPixel(x, y) == expected)
                {
                    return true;
                }
            }
        }

        return false;
    }
}
