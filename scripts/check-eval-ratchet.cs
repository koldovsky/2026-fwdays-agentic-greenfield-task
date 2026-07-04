using System.Text.Json;

var root = Environment.CurrentDirectory;
var datasetRoot = Path.Combine(root, "evals", "dataset");
var baselinePath = Path.Combine(root, "evals", "baselines", "output-eval.json");
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
    Console.WriteLine("Eval ratchet scaffold OK: dataset exists; baseline pending until evals-hardening.");
    return 0;
}

using var baseline = JsonDocument.Parse(File.ReadAllText(baselinePath));
if (!baseline.RootElement.TryGetProperty("passRate", out var passRate) || passRate.ValueKind is not JsonValueKind.Number)
{
    Console.Error.WriteLine("Eval baseline must contain numeric passRate.");
    return 1;
}

Console.WriteLine($"Eval ratchet scaffold OK: baseline passRate={passRate.GetDouble():P1}.");
return 0;
