using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Core.Tests.Detection;

public sealed class LabelMapperTests
{
    private static readonly string[] Labels = ["no-entry", "parking-prohibited", "stop-sign"];

    /// <summary>@trace FR-DETECT-03</summary>
    [Fact]
    public void MapClassId_ZeroBasedClassTwo_ReturnsStopSign()
    {
        var result = LabelMapper.MapClassId(2, Labels);

        Assert.Equal(2, result.ClassId);
        Assert.Equal("stop-sign", result.Label);
        Assert.False(result.UsedOneBasedFallback);
    }

    /// <summary>@trace FR-DETECT-03</summary>
    [Fact]
    public void MapClassId_OneBasedClassThree_ReturnsStopSign()
    {
        var result = LabelMapper.MapClassId(3, Labels);

        Assert.Equal(2, result.ClassId);
        Assert.Equal("stop-sign", result.Label);
        Assert.True(result.UsedOneBasedFallback);
    }

    /// <summary>@trace FR-DETECT-03</summary>
    [Fact]
    public void MapClassId_OutOfRange_ReturnsUnknownLabel()
    {
        var result = LabelMapper.MapClassId(99, Labels);

        Assert.Equal(-1, result.ClassId);
        Assert.Equal(LabelMapper.UnknownLabel, result.Label);
        Assert.False(result.UsedOneBasedFallback);
    }
}
