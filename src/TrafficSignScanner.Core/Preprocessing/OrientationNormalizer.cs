using SkiaSharp;

namespace TrafficSignScanner.Core.Preprocessing;

internal static class OrientationNormalizer
{
    internal static SKBitmap Normalize(SKBitmap source, SKEncodedOrigin origin)
    {
        ArgumentNullException.ThrowIfNull(source);

        return origin switch
        {
            SKEncodedOrigin.TopLeft or SKEncodedOrigin.Default => source.Copy(),
            SKEncodedOrigin.TopRight => Transform(source, source.Width, source.Height, canvas =>
            {
                canvas.Scale(-1, 1, source.Width / 2f, source.Height / 2f);
            }),
            SKEncodedOrigin.BottomRight => Transform(source, source.Width, source.Height, canvas =>
            {
                canvas.RotateDegrees(180, source.Width / 2f, source.Height / 2f);
            }),
            SKEncodedOrigin.BottomLeft => Transform(source, source.Width, source.Height, canvas =>
            {
                canvas.Scale(1, -1, source.Width / 2f, source.Height / 2f);
            }),
            SKEncodedOrigin.LeftTop => Transform(source, source.Height, source.Width, canvas =>
            {
                canvas.Translate(0, source.Width);
                canvas.RotateDegrees(270);
            }),
            SKEncodedOrigin.RightTop => Transform(source, source.Height, source.Width, canvas =>
            {
                canvas.Translate(source.Height, 0);
                canvas.RotateDegrees(90);
            }),
            SKEncodedOrigin.RightBottom => Transform(source, source.Height, source.Width, canvas =>
            {
                canvas.Translate(source.Height, 0);
                canvas.RotateDegrees(90);
                canvas.Scale(-1, 1, source.Height / 2f, source.Width / 2f);
            }),
            SKEncodedOrigin.LeftBottom => Transform(source, source.Height, source.Width, canvas =>
            {
                canvas.Translate(0, source.Width);
                canvas.RotateDegrees(270);
                canvas.Scale(-1, 1, source.Height / 2f, source.Width / 2f);
            }),
            _ => source.Copy(),
        };
    }

    private static SKBitmap Transform(
        SKBitmap source,
        int width,
        int height,
        Action<SKCanvas> configureCanvas)
    {
        var normalized = new SKBitmap(width, height, source.ColorType, source.AlphaType);
        using var canvas = new SKCanvas(normalized);
        canvas.Clear(SKColors.Transparent);
        configureCanvas(canvas);
        canvas.DrawBitmap(source, 0, 0, SKSamplingOptions.Default);
        canvas.Flush();
        return normalized;
    }
}
