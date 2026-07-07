using System.Diagnostics;
using System.Globalization;
using System.Text.Json;

var root = Environment.CurrentDirectory;
var datasetRoot = Path.Combine(root, "evals", "dataset");
var baselinePath = Path.Combine(root, "evals", "baselines", "output-eval.json");
var evalProjectPath = Path.Combine(root, "evals", "TrafficSignScanner.Evals", "TrafficSignScanner.Evals.csproj");
var requiredFolders = new[] { "no-entry", "parking-prohibited", "stop-sign", "negative" };

if (!Directory.Exists(datasetRoot))
{
    Console.Error.WriteLine("Missing evals/dataset");
    return 1;
}

foreach (var folder in requiredFolders)
{
    var path = Path.Combine(datasetRoot, folder);
    if (!Directory.Exists(path))
    {
        Console.Error.WriteLine($"Missing dataset folder: {folder}");
        return 1;
    }

    var imageCount = Directory.EnumerateFiles(path, "*.jpg").Count();
    if (imageCount == 0)
    {
        Console.Error.WriteLine($"Dataset folder has no .jpg files: {folder}");
        return 1;
    }
}

if (!File.Exists(baselinePath))
{
    Console.Error.WriteLine("Missing evals/baselines/output-eval.json — run evals-hardening to lock baseline.");
    return 1;
}

using var baselineDocument = JsonDocument.Parse(File.ReadAllText(baselinePath));
if (!baselineDocument.RootElement.TryGetProperty("passRate", out var baselinePassRate)
    || baselinePassRate.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Eval baseline must contain numeric passRate.");
    return 1;
}

if (!baselineDocument.RootElement.TryGetProperty("confidenceThreshold", out var baselineThresholdElement)
    || baselineThresholdElement.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Eval baseline must contain numeric confidenceThreshold.");
    return 1;
}

if (!baselineDocument.RootElement.TryGetProperty("totalCases", out var baselineTotalCasesElement)
    || baselineTotalCasesElement.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Eval baseline must contain numeric totalCases.");
    return 1;
}

var expectedPath = Path.Combine(datasetRoot, "expected.json");
if (!File.Exists(expectedPath))
{
    Console.Error.WriteLine("Missing evals/dataset/expected.json.");
    return 1;
}

using var expectedDocument = JsonDocument.Parse(File.ReadAllText(expectedPath));
if (!expectedDocument.RootElement.TryGetProperty("confidenceThreshold", out var expectedThresholdElement)
    || expectedThresholdElement.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("expected.json must contain numeric confidenceThreshold.");
    return 1;
}

var baselineThreshold = baselineThresholdElement.GetDouble();
var expectedThreshold = expectedThresholdElement.GetDouble();
if (Math.Abs(expectedThreshold - baselineThreshold) > 0.0001)
{
    Console.Error.WriteLine(
        $"Eval threshold mismatch: expected.json {expectedThreshold}, baseline {baselineThreshold}.");
    return 1;
}

var baselineTotalCases = baselineTotalCasesElement.GetInt32();
var expectedCaseCount = expectedDocument.RootElement.GetProperty("cases").GetArrayLength();
if (expectedCaseCount != baselineTotalCases)
{
    Console.Error.WriteLine(
        $"Eval case count mismatch: expected.json {expectedCaseCount}, baseline {baselineTotalCases}.");
    return 1;
}

if (!File.Exists(evalProjectPath))
{
    Console.Error.WriteLine($"Missing eval project: {evalProjectPath}");
    return 1;
}

var baselineMinimum = baselinePassRate.GetDouble();
var evalOutput = RunEvalRatchetTest(root, evalProjectPath);
if (evalOutput is null)
{
    Console.Error.WriteLine("Eval ratchet failed: could not run output eval test.");
    return 1;
}

var (observedPassRate, passedCases, totalCases) = evalOutput.Value;

if (totalCases != baselineTotalCases)
{
    Console.Error.WriteLine(
        $"Eval ratchet failed: observed {totalCases} cases, baseline {baselineTotalCases}.");
    return 1;
}

if (observedPassRate + 0.0001 < baselineMinimum)
{
    Console.Error.WriteLine(
        $"Eval ratchet failed: observed {observedPassRate:P1} ({passedCases}/{totalCases}), baseline {baselineMinimum:P1}.");
    return 1;
}

Console.WriteLine(
    $"Eval ratchet OK: observed {observedPassRate:P1} ({passedCases}/{totalCases}), baseline {baselineMinimum:P1}.");
return 0;

static (double PassRate, int PassedCases, int TotalCases)? RunEvalRatchetTest(string root, string evalProjectPath)
{
    var metricsPath = Path.Combine(Path.GetTempPath(), $"TrafficSignScanner-eval-metrics-{Guid.NewGuid():N}.txt");

    try
    {
        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments =
                $"test \"{evalProjectPath}\" --filter \"FullyQualifiedName~Output_eval_pass_rate_meets_locked_baseline\" --nologo",
            WorkingDirectory = root,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            Environment = { ["TRAFFIC_SIGN_SCANNER_EVAL_METRICS"] = metricsPath },
        });

        if (process is null)
        {
            return null;
        }

        var stdout = process.StandardOutput.ReadToEnd();
        var stderr = process.StandardError.ReadToEnd();
        process.WaitForExit();

        if (!string.IsNullOrWhiteSpace(stderr))
        {
            Console.Error.Write(stderr);
        }

        if (!string.IsNullOrWhiteSpace(stdout))
        {
            Console.Write(stdout);
        }

        if (process.ExitCode != 0)
        {
            return null;
        }

        if (!File.Exists(metricsPath))
        {
            Console.Error.WriteLine("Eval ratchet failed: eval metrics file was not written.");
            return null;
        }

        var parts = File.ReadAllText(metricsPath).Split(';');
        if (parts.Length != 3)
        {
            Console.Error.WriteLine("Eval ratchet failed: eval metrics file has invalid format.");
            return null;
        }

        return (
            double.Parse(parts[0], CultureInfo.InvariantCulture),
            int.Parse(parts[1], CultureInfo.InvariantCulture),
            int.Parse(parts[2], CultureInfo.InvariantCulture));
    }
    finally
    {
        if (File.Exists(metricsPath))
        {
            File.Delete(metricsPath);
        }
    }
}
