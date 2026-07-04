using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;

var root = Environment.CurrentDirectory;
var baselinePath = Path.Combine(root, "evals", "baselines", "coverage.json");
var coverageFiles = Directory.Exists(Path.Combine(root, "tests"))
    ? Directory.EnumerateFiles(Path.Combine(root, "tests"), "coverage.cobertura.xml", SearchOption.AllDirectories).ToArray()
    : Array.Empty<string>();

if (coverageFiles.Length == 0)
{
    Console.WriteLine("Coverage ratchet scaffold OK: no coverage report yet; baseline pending until coverage gate is enabled.");
    return 0;
}

var lineRate = coverageFiles
    .Select(path => XDocument.Load(path).Root?.Attribute("line-rate")?.Value)
    .Where(value => !string.IsNullOrWhiteSpace(value))
    .Select(value => double.Parse(value!, CultureInfo.InvariantCulture))
    .DefaultIfEmpty(0)
    .Max();

if (!File.Exists(baselinePath))
{
    Console.WriteLine($"Coverage ratchet scaffold OK: observed line-rate={lineRate:P1}; baseline pending.");
    return 0;
}

using var baseline = JsonDocument.Parse(File.ReadAllText(baselinePath));
if (!baseline.RootElement.TryGetProperty("lineRate", out var baselineRate) || baselineRate.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Coverage baseline must contain numeric lineRate.");
    return 1;
}

var minimum = baselineRate.GetDouble();
if (lineRate + 0.0001 < minimum)
{
    Console.Error.WriteLine($"Coverage ratchet failed: observed {lineRate:P1}, baseline {minimum:P1}.");
    return 1;
}

Console.WriteLine($"Coverage ratchet OK: observed {lineRate:P1}, baseline {minimum:P1}.");
return 0;
