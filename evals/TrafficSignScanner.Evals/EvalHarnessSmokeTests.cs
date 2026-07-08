namespace TrafficSignScanner.Evals;

public sealed class EvalHarnessSmokeTests
{
    [Theory]
    [InlineData("no-entry")]
    [InlineData("parking-prohibited")]
    [InlineData("stop-sign")]
    [InlineData("negative")]
    public void Dataset_folder_exists(string label)
    {
        var repoRoot = FindRepoRoot();
        var folder = Path.Combine(repoRoot, "evals", "dataset", label);

        Assert.True(Directory.Exists(folder), $"Missing eval dataset folder: {folder}");
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
