using TrafficSignScanner.Core.Preprocessing;

namespace TrafficSignScanner.Core.Tests.Preprocessing;

public sealed class CenterCropCalculatorTests
{
    /// <summary>@trace FR-PREPROC-01</summary>
    [Fact]
    public void Calculate_LandscapeImage_UsesFullHeightAndCentersWidth()
    {
        var crop = CenterCropCalculator.Calculate(sourceWidth: 800, sourceHeight: 600);

        Assert.Equal(100, crop.X);
        Assert.Equal(0, crop.Y);
        Assert.Equal(600, crop.Size);
    }

    /// <summary>@trace FR-PREPROC-01</summary>
    [Fact]
    public void Calculate_PortraitImage_UsesFullWidthAndCentersHeight()
    {
        var crop = CenterCropCalculator.Calculate(sourceWidth: 600, sourceHeight: 800);

        Assert.Equal(0, crop.X);
        Assert.Equal(100, crop.Y);
        Assert.Equal(600, crop.Size);
    }

    /// <summary>@trace FR-PREPROC-01</summary>
    [Fact]
    public void Calculate_SquareImage_UsesEntireImage()
    {
        var crop = CenterCropCalculator.Calculate(sourceWidth: 512, sourceHeight: 512);

        Assert.Equal(0, crop.X);
        Assert.Equal(0, crop.Y);
        Assert.Equal(512, crop.Size);
    }
}
