namespace TrafficSignScanner.Mcp.Security;

public sealed class ImagePathValidationException : Exception
{
    public ImagePathValidationException(string message)
        : base(message)
    {
    }
}
