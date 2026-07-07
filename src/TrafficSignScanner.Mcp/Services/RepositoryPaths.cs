namespace TrafficSignScanner.Mcp.Services;

public interface IRepositoryPaths
{
    string RepoRoot { get; }

    string ModelPath { get; }

    string LabelsPath { get; }
}

public sealed class RepositoryPaths : IRepositoryPaths
{
    public RepositoryPaths()
        : this(FindRepoRoot())
    {
    }

    internal RepositoryPaths(string repoRoot)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(repoRoot);
        RepoRoot = Path.GetFullPath(repoRoot);
        ModelPath = Path.Combine(RepoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "model.onnx");
        LabelsPath = Path.Combine(RepoRoot, "src", "TrafficSignScanner.App", "Resources", "Raw", "labels.txt");
    }

    public string RepoRoot { get; }

    public string ModelPath { get; }

    public string LabelsPath { get; }

    public static string FindRepoRoot()
    {
        var configuredRoot = Environment.GetEnvironmentVariable("TRAFFIC_SIGN_SCANNER_ROOT");
        if (!string.IsNullOrWhiteSpace(configuredRoot)
            && File.Exists(Path.Combine(configuredRoot, "TrafficSignScanner.slnx")))
        {
            return Path.GetFullPath(configuredRoot);
        }

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
