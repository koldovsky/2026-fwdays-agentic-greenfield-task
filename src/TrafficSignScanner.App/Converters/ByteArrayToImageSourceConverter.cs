using System.Globalization;

namespace TrafficSignScanner.Converters;

public sealed class ByteArrayToImageSourceConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not byte[] bytes || bytes.Length == 0)
        {
            return null;
        }

        var imageBytes = bytes.ToArray();
        return ImageSource.FromStream(() => new MemoryStream(imageBytes, writable: false));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
