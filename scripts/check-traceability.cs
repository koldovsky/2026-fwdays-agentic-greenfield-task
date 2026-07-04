using System.Text.RegularExpressions;

var root = Environment.CurrentDirectory;
var requirementsPath = Path.Combine(root, "docs", "requirements.md");
var specsRoot = Path.Combine(root, "openspec", "specs");

if (!File.Exists(requirementsPath))
{
    Console.Error.WriteLine("Missing docs/requirements.md");
    return 1;
}

if (!Directory.Exists(specsRoot))
{
    Console.Error.WriteLine("Missing openspec/specs");
    return 1;
}

var requirements = File.ReadAllText(requirementsPath);
var frIds = Regex.Matches(requirements, @"\bFR-[A-Z]+-\d{2}\b")
    .Select(match => match.Value)
    .Distinct()
    .Order()
    .ToArray();

var specText = string.Join(
    Environment.NewLine,
    Directory.EnumerateFiles(specsRoot, "spec.md", SearchOption.AllDirectories).Select(File.ReadAllText));

var missingSpecs = frIds
    .Where(id => !Regex.IsMatch(specText, $@"Refs:[^\n]*`{Regex.Escape(id)}`"))
    .ToArray();

if (missingSpecs.Length > 0)
{
    Console.Error.WriteLine("FR IDs missing OpenSpec citations:");
    foreach (var id in missingSpecs)
    {
        Console.Error.WriteLine($"- {id}");
    }

    return 1;
}

Console.WriteLine($"Traceability scaffold OK: {frIds.Length} FR IDs are cited by OpenSpec specs.");
Console.WriteLine("Code/test @trace and git trailer enforcement starts when capability implementation begins.");
return 0;
