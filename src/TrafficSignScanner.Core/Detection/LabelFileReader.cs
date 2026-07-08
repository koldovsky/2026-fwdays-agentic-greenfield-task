namespace TrafficSignScanner.Core.Detection;

public static class LabelFileReader
{
    /// <summary>@trace FR-DETECT-03</summary>
    public static IReadOnlyList<string> ReadLabels(string labelsPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(labelsPath);

        if (!File.Exists(labelsPath))
        {
            throw new FileNotFoundException("Labels file was not found.", labelsPath);
        }

        return File.ReadAllLines(labelsPath)
            .Select(line => line.Trim())
            .Where(line => line.Length > 0)
            .ToArray();
    }
}
