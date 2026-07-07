using SkiaSharp;
using TrafficSignScanner.Core.Preprocessing;

namespace TrafficSignScanner.Core.Tests.Preprocessing;

public sealed class ImagePreprocessorTests
{
    /// <summary>@trace FR-PREPROC-01, FR-PREPROC-02</summary>
    [Fact]
    public void CreateModelInput_LandscapeImage_ReportsCenterCropAnd320Resize()
    {
        using var source = CreateLandscapeBitmap(width: 800, height: 600);
        source.SetPixel(100, 0, new SKColor(255, 0, 0));

        var result = ImagePreprocessor.CreateModelInput(source);

        Assert.Equal(100, result.CropRectangle.X);
        Assert.Equal(0, result.CropRectangle.Y);
        Assert.Equal(600, result.CropRectangle.Size);
        Assert.Equal(ImagePreprocessor.ModelInputSize, result.ResizeWidth);
        Assert.Equal(ImagePreprocessor.ModelInputSize, result.ResizeHeight);
    }

    /// <summary>@trace FR-PREPROC-03</summary>
    [Fact]
    public void CreateModelInput_ProducesNchwTensorShape()
    {
        using var source = CreateSquareBitmap(size: 320, fill: SKColors.White);

        var result = ImagePreprocessor.CreateModelInput(source);
        var tensor = result.Tensor;

        Assert.Equal(new[] { 1, 3, 320, 320 }, tensor.Dimensions.ToArray());
    }

    /// <summary>@trace FR-PREPROC-03</summary>
    [Fact]
    public void CreateModelInput_WritesRawRgbValuesWithoutNormalization()
    {
        using var source = CreateSquareBitmap(size: 320, fill: new SKColor(255, 128, 0));

        var result = ImagePreprocessor.CreateModelInput(source);
        var tensor = result.Tensor;

        Assert.Equal(255f, tensor[0, 0, 0, 0]);
        Assert.Equal(128f, tensor[0, 1, 0, 0]);
        Assert.Equal(0f, tensor[0, 2, 0, 0]);
    }

    /// <summary>@trace FR-PREPROC-03</summary>
    [Fact]
    public void CreateModelInput_AssignsChannelsInRgbOrder()
    {
        using var source = CreateSquareBitmap(size: 320, fill: SKColors.Black);
        source.SetPixel(10, 20, new SKColor(red: 10, green: 20, blue: 30));

        var result = ImagePreprocessor.CreateModelInput(source);
        var tensor = result.Tensor;

        Assert.Equal(10f, tensor[0, 0, 20, 10]);
        Assert.Equal(20f, tensor[0, 1, 20, 10]);
        Assert.Equal(30f, tensor[0, 2, 20, 10]);
    }

    /// <summary>@trace FR-PREPROC-01, FR-PREPROC-02</summary>
    [Fact]
    public void CreateModelInput_PortraitImage_ReportsCenterCropAnd320Resize()
    {
        using var source = CreatePortraitBitmap(width: 600, height: 800);
        source.SetPixel(0, 100, new SKColor(255, 0, 0));

        var result = ImagePreprocessor.CreateModelInput(source);

        Assert.Equal(0, result.CropRectangle.X);
        Assert.Equal(100, result.CropRectangle.Y);
        Assert.Equal(600, result.CropRectangle.Size);
        Assert.Equal(ImagePreprocessor.ModelInputSize, result.ResizeWidth);
        Assert.Equal(ImagePreprocessor.ModelInputSize, result.ResizeHeight);
    }

    /// <summary>@trace FR-PREPROC-01, FR-PREPROC-02, FR-PREPROC-03</summary>
    [Fact]
    public void CreateModelInput_FromEncodedBytes_DecodesAndPreprocesses()
    {
        using var source = CreateLandscapeBitmap(width: 640, height: 480);
        source.SetPixel(80, 0, new SKColor(0, 255, 0));
        var encoded = EncodePng(source);

        var result = ImagePreprocessor.CreateModelInput(encoded);

        Assert.Equal(80, result.CropRectangle.X);
        Assert.Equal(new[] { 1, 3, 320, 320 }, result.Tensor.Dimensions.ToArray());
        Assert.Equal(0f, result.Tensor[0, 0, 0, 0]);
        Assert.Equal(255f, result.Tensor[0, 1, 0, 0]);
        Assert.Equal(0f, result.Tensor[0, 2, 0, 0]);
    }

    private static SKBitmap CreatePortraitBitmap(int width, int height)
    {
        var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(SKColors.Blue);
        return bitmap;
    }

    private static SKBitmap CreateLandscapeBitmap(int width, int height)
    {
        var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(SKColors.Blue);
        return bitmap;
    }

    private static SKBitmap CreateSquareBitmap(int size, SKColor fill)
    {
        var bitmap = new SKBitmap(size, size, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(fill);
        return bitmap;
    }

    private static byte[] EncodePng(SKBitmap bitmap)
    {
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
