using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Services;

public sealed class ModelAssetService : IModelAssetService
{
    private const string ModelFileName = "model.onnx";
    private const string LabelsFileName = "labels.txt";

    public async Task<string> EnsureModelPathAsync(CancellationToken cancellationToken = default)
    {
        var destinationPath = Path.Combine(FileSystem.AppDataDirectory, ModelFileName);
        if (File.Exists(destinationPath))
        {
            return destinationPath;
        }

        await using var sourceStream = await FileSystem.OpenAppPackageFileAsync(ModelFileName);
        ModelAssetCopier.EnsureModelFile(sourceStream, destinationPath);
        return destinationPath;
    }

    public async Task<IReadOnlyList<string>> LoadLabelsAsync(CancellationToken cancellationToken = default)
    {
        await using var sourceStream = await FileSystem.OpenAppPackageFileAsync(LabelsFileName);
        using var reader = new StreamReader(sourceStream);
        var labels = new List<string>();

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(cancellationToken).ConfigureAwait(false);
            if (line is null)
            {
                break;
            }

            if (!string.IsNullOrWhiteSpace(line))
            {
                labels.Add(line.Trim());
            }
        }

        return labels;
    }
}
