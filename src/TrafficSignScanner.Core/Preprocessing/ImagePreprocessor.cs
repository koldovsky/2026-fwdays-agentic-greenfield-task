using Microsoft.ML.OnnxRuntime.Tensors;
using SkiaSharp;

namespace TrafficSignScanner.Core.Preprocessing;

public sealed record PreprocessingResult(
    CropRectangle CropRectangle,
    int ResizeWidth,
    int ResizeHeight,
    DenseTensor<float> Tensor);

public static class ImagePreprocessor
{
    public const int ModelInputSize = 320;

    /// <summary>@trace FR-PREPROC-01, FR-PREPROC-02, FR-PREPROC-03</summary>
    public static PreprocessingResult CreateModelInput(SKBitmap source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var crop = CenterCropCalculator.Calculate(source.Width, source.Height);
        using var cropped = Crop(source, crop);
        using var resized = ResizeToModelInput(cropped);
        var tensor = CreateTensor(resized);

        return new PreprocessingResult(crop, resized.Width, resized.Height, tensor);
    }

    /// <summary>@trace FR-PREPROC-01, FR-PREPROC-02, FR-PREPROC-03</summary>
    public static PreprocessingResult CreateModelInput(ReadOnlySpan<byte> encodedImageBytes)
    {
        using var bitmap = DecodeBitmap(encodedImageBytes);
        return CreateModelInput(bitmap);
    }

    /// <summary>@trace FR-PREPROC-02</summary>
    internal static SKBitmap ResizeToModelInput(SKBitmap croppedSquare)
    {
        ArgumentNullException.ThrowIfNull(croppedSquare);

        var resized = croppedSquare.Resize(
            new SKImageInfo(ModelInputSize, ModelInputSize, SKColorType.Rgba8888, SKAlphaType.Premul),
            SKSamplingOptions.Default);

        return resized ?? throw new InvalidOperationException("Failed to resize image to model input size.");
    }

    private static SKBitmap DecodeBitmap(ReadOnlySpan<byte> encodedImageBytes)
    {
        using var data = SKData.CreateCopy(encodedImageBytes);
        using var codec = SKCodec.Create(data)
            ?? throw new InvalidOperationException("Unable to decode image bytes.");

        using var decoded = SKBitmap.Decode(codec)
            ?? throw new InvalidOperationException("Unable to decode image bytes.");

        return OrientationNormalizer.Normalize(decoded, codec.EncodedOrigin);
    }

    private static SKBitmap Crop(SKBitmap source, CropRectangle crop)
    {
        var subset = new SKRectI(crop.X, crop.Y, crop.X + crop.Size, crop.Y + crop.Size);
        var cropped = new SKBitmap(crop.Size, crop.Size, SKColorType.Rgba8888, SKAlphaType.Premul);

        if (!source.ExtractSubset(cropped, subset))
        {
            cropped.Dispose();
            throw new InvalidOperationException("Failed to center-crop source image.");
        }

        return cropped;
    }

    private static DenseTensor<float> CreateTensor(SKBitmap bitmap)
    {
        var tensor = new DenseTensor<float>(new[] { 1, 3, bitmap.Height, bitmap.Width });

        for (var y = 0; y < bitmap.Height; y++)
        {
            for (var x = 0; x < bitmap.Width; x++)
            {
                var pixel = bitmap.GetPixel(x, y);
                tensor[0, 0, y, x] = pixel.Red;
                tensor[0, 1, y, x] = pixel.Green;
                tensor[0, 2, y, x] = pixel.Blue;
            }
        }

        return tensor;
    }
}
