namespace TrafficSignScanner.Evals;

using System.Globalization;

public sealed class ExpectedDatasetTests
{
    /// <summary>@trace NFR-EVAL-01</summary>
    [Fact]
    public void ExpectedJson_CoversEveryDatasetImage()
    {
        var repoRoot = FindRepoRoot();
        var datasetRoot = Path.Combine(repoRoot, "evals", "dataset");
        var expectedPath = Path.Combine(datasetRoot, "expected.json");
        var expected = ExpectedDatasetReader.Load(expectedPath);

        var missingCases = ExpectedDatasetValidator.FindMissingCases(datasetRoot, expected);
        var unexpectedCases = ExpectedDatasetValidator.FindUnexpectedCases(datasetRoot, expected);

        Assert.Empty(missingCases);
        Assert.Empty(unexpectedCases);
        Assert.Equal(40, expected.Cases.Count);
    }

    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "TrafficSignScanner.slnx")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root.");
    }
}

public sealed class OutputEvalRatchetTests
{
    /// <summary>@trace NFR-EVAL-01</summary>
    [Fact]
    public void Output_eval_pass_rate_meets_locked_baseline()
    {
        var repoRoot = FindRepoRoot();
        var modelPath = Path.Combine(repoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "model.onnx");
        var baselinePath = Path.Combine(repoRoot, "evals", "baselines", "output-eval.json");

        Assert.True(File.Exists(modelPath), $"Bundled model is required for output eval: {modelPath}");
        Assert.True(File.Exists(baselinePath), $"Output eval baseline is required: {baselinePath}");

        var baseline = EvalBaselineReader.LoadOutputBaseline(baselinePath);
        var result = OutputEvalRunner.Run(repoRoot);

        Console.WriteLine($"OUTPUT_EVAL_PASS_RATE={result.PassRate:P1} ({result.PassedCases}/{result.TotalCases})");
        foreach (var failure in result.Failures)
        {
            Console.WriteLine($"EVAL_FAIL: {failure}");
        }

        var metricsPath = Environment.GetEnvironmentVariable("TRAFFIC_SIGN_SCANNER_EVAL_METRICS");
        if (!string.IsNullOrWhiteSpace(metricsPath))
        {
            File.WriteAllText(
                metricsPath,
                $"{result.PassRate.ToString(CultureInfo.InvariantCulture)};{result.PassedCases};{result.TotalCases}");
        }

        Assert.Equal(baseline.TotalCases, result.TotalCases);
        Assert.True(
            result.PassRate + 0.0001 >= baseline.PassRate,
            $"Output eval regressed: observed {result.PassRate:P1}, baseline {baseline.PassRate:P1}.");
    }

    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "TrafficSignScanner.slnx")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root.");
    }
}
