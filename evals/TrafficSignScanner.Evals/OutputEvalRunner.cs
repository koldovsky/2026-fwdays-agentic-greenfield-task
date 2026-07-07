using System.Text.Json;
using System.Text.Json.Serialization;
using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Evals;

public sealed class ExpectedDataset
{
    public float ConfidenceThreshold { get; init; } = ModelContract.DefaultConfidenceThreshold;

    public List<ExpectedDatasetCase> Cases { get; init; } = [];
}

public sealed class ExpectedDatasetCase
{
    public required string Image { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ExpectedLabel { get; init; }
}

public sealed class OutputEvalRunResult
{
    public required int TotalCases { get; init; }

    public required int PassedCases { get; init; }

    public double PassRate => TotalCases == 0 ? 0d : PassedCases / (double)TotalCases;

    public required IReadOnlyList<string> Failures { get; init; }
}

public static class ExpectedDatasetGenerator
{
    public static ExpectedDataset GenerateFromFolders(string datasetRoot)
    {
        var cases = new List<ExpectedDatasetCase>();
        var labels = new[] { "no-entry", "parking-prohibited", "stop-sign", "negative" };

        foreach (var label in labels)
        {
            var folder = Path.Combine(datasetRoot, label);
            if (!Directory.Exists(folder))
            {
                continue;
            }

            foreach (var imagePath in Directory.EnumerateFiles(folder, "*.jpg").OrderBy(path => path))
            {
                cases.Add(new ExpectedDatasetCase
                {
                    Image = $"{label}/{Path.GetFileName(imagePath)}",
                    ExpectedLabel = label == "negative" ? null : label,
                });
            }
        }

        return new ExpectedDataset { Cases = cases };
    }
}

public static class OutputEvalRunner
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static OutputEvalRunResult Run(string repoRoot)
    {
        var datasetRoot = Path.Combine(repoRoot, "evals", "dataset");
        var expectedPath = Path.Combine(datasetRoot, "expected.json");
        EnsureExpectedJson(expectedPath, datasetRoot);

        var expected = JsonSerializer.Deserialize<ExpectedDataset>(File.ReadAllText(expectedPath), JsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize expected.json.");

        var bundledModelPath = Path.Combine(repoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "model.onnx");
        var bundledLabelsPath = Path.Combine(repoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "labels.txt");
        var evalModelDirectory = Path.Combine(Path.GetTempPath(), "TrafficSignScanner-eval");
        Directory.CreateDirectory(evalModelDirectory);
        var evalModelPath = Path.Combine(evalModelDirectory, "model.onnx");
        ModelAssetCopier.EnsureModelFile(bundledModelPath, evalModelPath);

        var labels = LabelFileReader.ReadLabels(bundledLabelsPath);
        using var detector = new TrafficSignDetector(evalModelPath, labels, expected.ConfidenceThreshold);

        var failures = new List<string>();
        var passed = 0;

        foreach (var evalCase in expected.Cases)
        {
            var imagePath = Path.Combine(datasetRoot, evalCase.Image.Replace('/', Path.DirectorySeparatorChar));
            var encodedImage = File.ReadAllBytes(imagePath);
            var detections = detector.DetectAsync(encodedImage).GetAwaiter().GetResult();

            if (evalCase.ExpectedLabel is null)
            {
                if (detections.Count == 0)
                {
                    passed++;
                }
                else
                {
                    failures.Add($"{evalCase.Image}: expected no detection, got {FormatDetections(detections)}");
                }

                continue;
            }

            if (detections.Any(detection => detection.Label == evalCase.ExpectedLabel))
            {
                passed++;
            }
            else
            {
                failures.Add($"{evalCase.Image}: expected {evalCase.ExpectedLabel}, got {FormatDetections(detections)}");
            }
        }

        return new OutputEvalRunResult
        {
            TotalCases = expected.Cases.Count,
            PassedCases = passed,
            Failures = failures,
        };
    }

    public static void EnsureExpectedJson(string expectedPath, string datasetRoot)
    {
        if (File.Exists(expectedPath))
        {
            return;
        }

        var dataset = ExpectedDatasetGenerator.GenerateFromFolders(datasetRoot);
        File.WriteAllText(expectedPath, JsonSerializer.Serialize(dataset, JsonOptions));
    }

    private static string FormatDetections(IReadOnlyList<Detection> detections)
    {
        if (detections.Count == 0)
        {
            return "none";
        }

        return string.Join(", ", detections.Select(detection => $"{detection.Label}@{detection.Confidence:F2}"));
    }
}
