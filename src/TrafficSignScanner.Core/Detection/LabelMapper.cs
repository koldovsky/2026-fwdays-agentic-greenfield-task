namespace TrafficSignScanner.Core.Detection;

public readonly record struct LabelMappingResult(int ClassId, string Label, bool UsedOneBasedFallback);

public static class LabelMapper
{
    public const string UnknownLabel = "unknown";

    /// <summary>@trace FR-DETECT-03</summary>
    public static LabelMappingResult MapClassId(long rawClassId, IReadOnlyList<string> labels)
    {
        ArgumentNullException.ThrowIfNull(labels);

        if (labels.Count == 0)
        {
            return new LabelMappingResult(-1, UnknownLabel, false);
        }

        var classId = checked((int)rawClassId);

        if (classId >= 0 && classId < labels.Count)
        {
            return new LabelMappingResult(classId, labels[classId], false);
        }

        var oneBasedIndex = classId - 1;
        if (oneBasedIndex >= 0 && oneBasedIndex < labels.Count)
        {
            return new LabelMappingResult(oneBasedIndex, labels[oneBasedIndex], true);
        }

        return new LabelMappingResult(-1, UnknownLabel, false);
    }
}
