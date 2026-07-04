var root = Environment.CurrentDirectory;

var requiredPaths = new[]
{
    "TrafficSignScanner.slnx",
    "src/TrafficSignScanner.Core/TrafficSignScanner.Core.csproj",
    "src/TrafficSignScanner.App/TrafficSignScanner.App.csproj",
    "src/TrafficSignScanner.Mcp/TrafficSignScanner.Mcp.csproj",
    "tests/TrafficSignScanner.Core.Tests/TrafficSignScanner.Core.Tests.csproj",
    "evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj",
    "scripts/check-traceability.cs",
    "scripts/check-eval-ratchet.cs",
    "scripts/check-coverage-ratchet.cs",
    ".githooks/pre-commit",
    ".githooks/commit-msg",
    ".githooks/setup.ps1",
    ".github/workflows/ci.yml",
    "docs/agents/routing.md",
    "docs/mvp-capability-plan.md"
};

var missing = requiredPaths
    .Where(relativePath => !File.Exists(Path.Combine(root, relativePath)))
    .ToArray();

if (missing.Length > 0)
{
    Console.Error.WriteLine("G0 scaffold is missing required files:");
    foreach (var path in missing)
    {
        Console.Error.WriteLine($"- {path}");
    }

    return 1;
}

Console.WriteLine("G0 scaffold status OK: required harness files are present.");
Console.WriteLine("This script verifies scaffold shape; build/test/OpenSpec/check-script results are validated by the surrounding gate run.");
return 0;
