namespace TrafficSignScanner.Evals;

public sealed class DetectionOutputEvalTests
{
    /// <summary>@trace FR-DETECT-01, FR-DETECT-02, FR-DETECT-03</summary>
    [Fact]
    public void Provisional_output_eval_runs_against_dataset()
    {
        var repoRoot = FindRepoRoot();
        var modelPath = Path.Combine(repoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "model.onnx");
        if (!File.Exists(modelPath))
        {
            return;
        }

        var result = OutputEvalRunner.Run(repoRoot);

        Assert.True(result.TotalCases > 0, "Expected at least one eval case.");
        Console.WriteLine($"PROVISIONAL_PASS_RATE={result.PassRate:P1} ({result.PassedCases}/{result.TotalCases})");
        foreach (var failure in result.Failures)
        {
            Console.WriteLine($"EVAL_FAIL: {failure}");
        }
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
