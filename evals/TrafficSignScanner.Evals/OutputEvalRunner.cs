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

public sealed class OutputEvalBaseline
{
    public required double PassRate { get; init; }

    public required int PassedCases { get; init; }

    public required int TotalCases { get; init; }

    public required float ConfidenceThreshold { get; init; }

    public required string LockedAt { get; init; }
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

public static class ExpectedDatasetValidator
{
    /// <summary>@trace NFR-EVAL-01</summary>
    public static IReadOnlyList<string> FindMissingCases(string datasetRoot, ExpectedDataset expected)
    {
        var expectedImages = expected.Cases
            .Select(evalCase => evalCase.Image.Replace('/', Path.DirectorySeparatorChar))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var actualImages = Directory
            .EnumerateFiles(datasetRoot, "*.jpg", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(datasetRoot, path))
            .OrderBy(path => path)
            .ToArray();

        return actualImages
            .Where(image => !expectedImages.Contains(image))
            .ToArray();
    }

    /// <summary>@trace NFR-EVAL-01</summary>
    public static IReadOnlyList<string> FindUnexpectedCases(string datasetRoot, ExpectedDataset expected)
    {
        var actualImages = Directory
            .EnumerateFiles(datasetRoot, "*.jpg", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(datasetRoot, path))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return expected.Cases
            .Where(evalCase => !actualImages.Contains(evalCase.Image.Replace('/', Path.DirectorySeparatorChar)))
            .Select(evalCase => evalCase.Image)
            .ToArray();
    }
}

public static class ExpectedDatasetReader
{
    /// <summary>@trace NFR-EVAL-01</summary>
    public static ExpectedDataset Load(string expectedPath)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(expectedPath));
        var root = document.RootElement;

        var cases = new List<ExpectedDatasetCase>();
        foreach (var caseElement in root.GetProperty("cases").EnumerateArray())
        {
            var image = caseElement.GetProperty("image").GetString()
                ?? throw new InvalidOperationException("expected.json case image is required.");

            string? expectedLabel = null;
            if (caseElement.TryGetProperty("expectedLabel", out var labelElement)
                && labelElement.ValueKind is not JsonValueKind.Null)
            {
                expectedLabel = labelElement.GetString();
            }

            cases.Add(new ExpectedDatasetCase
            {
                Image = image,
                ExpectedLabel = expectedLabel,
            });
        }

        return new ExpectedDataset
        {
            ConfidenceThreshold = root.GetProperty("confidenceThreshold").GetSingle(),
            Cases = cases,
        };
    }
}

public static class EvalBaselineReader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static OutputEvalBaseline LoadOutputBaseline(string baselinePath)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(baselinePath));
        var root = document.RootElement;

        return new OutputEvalBaseline
        {
            PassRate = root.GetProperty("passRate").GetDouble(),
            PassedCases = root.GetProperty("passedCases").GetInt32(),
            TotalCases = root.GetProperty("totalCases").GetInt32(),
            ConfidenceThreshold = root.GetProperty("confidenceThreshold").GetSingle(),
            LockedAt = root.GetProperty("lockedAt").GetString()
                ?? throw new InvalidOperationException("Output baseline lockedAt is required."),
        };
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

    /// <summary>@trace NFR-EVAL-01</summary>
    public static OutputEvalRunResult Run(string repoRoot)
    {
        var datasetRoot = Path.Combine(repoRoot, "evals", "dataset");
        var expectedPath = Path.Combine(datasetRoot, "expected.json");
        if (!File.Exists(expectedPath))
        {
            throw new InvalidOperationException("Missing evals/dataset/expected.json.");
        }

        var expected = ExpectedDatasetReader.Load(expectedPath);

        var missingCases = ExpectedDatasetValidator.FindMissingCases(datasetRoot, expected);
        if (missingCases.Count > 0)
        {
            throw new InvalidOperationException(
                $"expected.json is missing {missingCases.Count} dataset image(s): {string.Join(", ", missingCases)}");
        }

        var unexpectedCases = ExpectedDatasetValidator.FindUnexpectedCases(datasetRoot, expected);
        if (unexpectedCases.Count > 0)
        {
            throw new InvalidOperationException(
                $"expected.json references {unexpectedCases.Count} missing image(s): {string.Join(", ", unexpectedCases)}");
        }

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

            if (detections.Any(detection =>
                    detection.Label == evalCase.ExpectedLabel
                    && detection.Confidence >= expected.ConfidenceThreshold))
            {
                passed++;
            }
            else
            {
                failures.Add($"{evalCase.Image}: expected {evalCase.ExpectedLabel} @ >={expected.ConfidenceThreshold:F2}, got {FormatDetections(detections)}");
            }
        }

        return new OutputEvalRunResult
        {
            TotalCases = expected.Cases.Count,
            PassedCases = passed,
            Failures = failures,
        };
    }

    public static void WriteExpectedJson(string expectedPath, string datasetRoot)
    {
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
