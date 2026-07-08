using Microsoft.ML.OnnxRuntime;

namespace TrafficSignScanner.Core.Detection;

public interface IInferenceSessionFactory
{
    InferenceSession CreateSession(string modelPath);
}

public sealed class DefaultInferenceSessionFactory : IInferenceSessionFactory
{
    public InferenceSession CreateSession(string modelPath) => new(modelPath);
}

/// <summary>@trace FR-DETECT-01</summary>
public sealed class LazyInferenceSessionHolder : IDisposable
{
    private readonly string _modelPath;
    private readonly IInferenceSessionFactory _factory;
    private readonly object _gate = new();
    private InferenceSession? _session;
    private bool _disposed;

    public LazyInferenceSessionHolder(string modelPath, IInferenceSessionFactory? factory = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(modelPath);
        _modelPath = modelPath;
        _factory = factory ?? new DefaultInferenceSessionFactory();
    }

    public InferenceSession GetSession()
    {
        lock (_gate)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            return _session ??= _factory.CreateSession(_modelPath);
        }
    }

    public void Dispose()
    {
        lock (_gate)
        {
            if (_disposed)
            {
                return;
            }

            _session?.Dispose();
            _session = null;
            _disposed = true;
        }
    }
}
