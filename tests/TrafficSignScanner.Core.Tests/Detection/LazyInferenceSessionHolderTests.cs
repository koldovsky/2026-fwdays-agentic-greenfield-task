using Microsoft.ML.OnnxRuntime;
using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Core.Tests.Detection;

public sealed class LazyInferenceSessionHolderTests
{
    /// <summary>@trace FR-DETECT-01</summary>
    [Fact]
    public void GetSession_AfterDispose_ThrowsObjectDisposedException()
    {
        var modelPath = RequireBundledModelPath();
        var holder = new LazyInferenceSessionHolder(modelPath);
        holder.Dispose();

        Assert.Throws<ObjectDisposedException>(() => holder.GetSession());
    }

    /// <summary>@trace FR-DETECT-01</summary>
    [Fact]
    public void GetSession_ReusesExistingSession()
    {
        var modelPath = RequireBundledModelPath();

        var factory = new CountingInferenceSessionFactory();
        using var holder = new LazyInferenceSessionHolder(modelPath, factory);

        var first = holder.GetSession();
        var second = holder.GetSession();

        Assert.Same(first, second);
        Assert.Equal(1, factory.CreateCount);
    }

    private static string RequireBundledModelPath()
    {
        var modelPath = FindBundledModelPath();
        Assert.True(File.Exists(modelPath), $"Bundled model is required: {modelPath}");
        return modelPath;
    }

    private static string FindBundledModelPath()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "src", "TrafficSignScanner.App", "Resources", "Raw", "model.onnx");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        return string.Empty;
    }

    private sealed class CountingInferenceSessionFactory : IInferenceSessionFactory
    {
        public int CreateCount { get; private set; }

        public InferenceSession CreateSession(string modelPath)
        {
            CreateCount++;
            return new InferenceSession(modelPath);
        }
    }
}
