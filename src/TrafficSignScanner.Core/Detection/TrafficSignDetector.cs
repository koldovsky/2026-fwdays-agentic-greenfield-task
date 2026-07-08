using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using TrafficSignScanner.Core.Preprocessing;

namespace TrafficSignScanner.Core.Detection;

public interface IOnnxInferenceEngine
{
    /// <summary>@trace FR-DETECT-01</summary>
    OnnxInferenceOutput Run(DenseTensor<float> inputTensor);
}

public sealed record OnnxInferenceOutput(
    DenseTensor<float> Boxes,
    DenseTensor<long> Classes,
    DenseTensor<float> Scores);

public sealed class OnnxInferenceEngine : IOnnxInferenceEngine, IDisposable
{
    private readonly LazyInferenceSessionHolder _sessionHolder;

    public OnnxInferenceEngine(LazyInferenceSessionHolder sessionHolder)
    {
        _sessionHolder = sessionHolder ?? throw new ArgumentNullException(nameof(sessionHolder));
    }

    public OnnxInferenceOutput Run(DenseTensor<float> inputTensor)
    {
        ArgumentNullException.ThrowIfNull(inputTensor);

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor(ModelContract.InputName, inputTensor),
        };

        using var results = _sessionHolder.GetSession().Run(inputs);
        var boxes = results.First(result => result.Name == ModelContract.BoxesOutputName).AsTensor<float>().ToDenseTensor();
        var classes = results.First(result => result.Name == ModelContract.ClassesOutputName).AsTensor<long>().ToDenseTensor();
        var scores = results.First(result => result.Name == ModelContract.ScoresOutputName).AsTensor<float>().ToDenseTensor();
        return new OnnxInferenceOutput(boxes, classes, scores);
    }

    public void Dispose() => _sessionHolder.Dispose();
}

/// <summary>@trace FR-DETECT-01, FR-DETECT-02, FR-DETECT-03</summary>
public sealed class TrafficSignDetector : IDetector, IDisposable
{
    private readonly IOnnxInferenceEngine _inferenceEngine;
    private readonly IReadOnlyList<string> _labels;
    private readonly float _confidenceThreshold;
    private readonly bool _ownsEngine;

    public TrafficSignDetector(
        string modelPath,
        IReadOnlyList<string> labels,
        float confidenceThreshold = ModelContract.DefaultConfidenceThreshold,
        IInferenceSessionFactory? sessionFactory = null)
        : this(
            new OnnxInferenceEngine(new LazyInferenceSessionHolder(modelPath, sessionFactory)),
            labels,
            confidenceThreshold,
            ownsEngine: true)
    {
    }

    internal TrafficSignDetector(
        IOnnxInferenceEngine inferenceEngine,
        IReadOnlyList<string> labels,
        float confidenceThreshold,
        bool ownsEngine)
    {
        _inferenceEngine = inferenceEngine ?? throw new ArgumentNullException(nameof(inferenceEngine));
        _labels = labels ?? throw new ArgumentNullException(nameof(labels));
        _confidenceThreshold = confidenceThreshold;
        _ownsEngine = ownsEngine;
    }

    public Task<IReadOnlyList<Detection>> DetectAsync(
        ReadOnlyMemory<byte> encodedImageBytes,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var preprocessing = ImagePreprocessor.CreateModelInput(encodedImageBytes.Span);
        var output = _inferenceEngine.Run(preprocessing.Tensor);
        var detections = DetectionOutputParser.Parse(
            output.Boxes,
            output.Classes,
            output.Scores,
            _labels,
            _confidenceThreshold);

        return Task.FromResult(detections);
    }

    public void Dispose()
    {
        if (_ownsEngine && _inferenceEngine is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }
}
