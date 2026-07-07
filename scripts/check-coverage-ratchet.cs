using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;

var root = Environment.CurrentDirectory;
var baselinePath = Path.Combine(root, "evals", "baselines", "coverage.json");
var coverageDirectory = Path.Combine(root, "tests", "TrafficSignScanner.Core.Tests", "TestResults", "coverage");

if (!File.Exists(baselinePath))
{
    Console.Error.WriteLine("Missing evals/baselines/coverage.json — run evals-hardening to lock baseline.");
    return 1;
}

using var baselineDocument = JsonDocument.Parse(File.ReadAllText(baselinePath));
if (!baselineDocument.RootElement.TryGetProperty("lineRate", out var baselineRateElement)
    || baselineRateElement.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Coverage baseline must contain numeric lineRate.");
    return 1;
}

var minimum = baselineRateElement.GetDouble();
var coverageFiles = Directory.Exists(coverageDirectory)
    ? Directory.EnumerateFiles(coverageDirectory, "coverage.cobertura.xml", SearchOption.AllDirectories).ToArray()
    : [];

if (coverageFiles.Length == 0)
{
    if (!TryCollectCoverage(root))
    {
        Console.Error.WriteLine("Coverage ratchet failed: could not collect Core coverage report.");
        return 1;
    }

    coverageFiles = Directory.Exists(coverageDirectory)
        ? Directory.EnumerateFiles(coverageDirectory, "coverage.cobertura.xml", SearchOption.AllDirectories).ToArray()
        : [];
}

if (coverageFiles.Length == 0)
{
    Console.Error.WriteLine("Coverage ratchet failed: no coverage.cobertura.xml found after collection.");
    return 1;
}

var latestCoveragePath = coverageFiles
    .OrderByDescending(File.GetLastWriteTimeUtc)
    .First();
var lineRate = ReadCoreLineRate(latestCoveragePath);

if (lineRate + 0.0001 < minimum)
{
    Console.Error.WriteLine($"Coverage ratchet failed: observed {lineRate:P1}, baseline {minimum:P1}.");
    return 1;
}

Console.WriteLine($"Coverage ratchet OK: observed {lineRate:P1} ({latestCoveragePath}), baseline {minimum:P1}.");
return 0;

static double ReadCoreLineRate(string coveragePath)
{
    var document = XDocument.Load(coveragePath);
    var package = document.Descendants("package")
        .FirstOrDefault(element => element.Attribute("name")?.Value == "TrafficSignScanner.Core");

    if (package?.Attribute("line-rate")?.Value is { } packageRate
        && double.TryParse(packageRate, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedPackageRate))
    {
        return parsedPackageRate;
    }

    var rootRate = document.Root?.Attribute("line-rate")?.Value;
    return double.TryParse(rootRate, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedRootRate)
        ? parsedRootRate
        : 0;
}

static bool TryCollectCoverage(string root)
{
    var projectPath = Path.Combine(root, "tests", "TrafficSignScanner.Core.Tests", "TrafficSignScanner.Core.Tests.csproj");
    var resultsDirectory = Path.Combine(root, "tests", "TrafficSignScanner.Core.Tests", "TestResults", "coverage");

    Directory.CreateDirectory(resultsDirectory);

    using var process = Process.Start(new ProcessStartInfo
    {
        FileName = "dotnet",
        Arguments =
            $"test \"{projectPath}\" --collect:\"XPlat Code Coverage\" --results-directory \"{resultsDirectory}\" --nologo",
        WorkingDirectory = root,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
    });

    if (process is null)
    {
        return false;
    }

    process.WaitForExit();
    return process.ExitCode == 0;
}
