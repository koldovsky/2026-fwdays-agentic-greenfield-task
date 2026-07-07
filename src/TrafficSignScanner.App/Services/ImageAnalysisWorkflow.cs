using TrafficSignScanner.Core.Analysis;
using TrafficSignScanner.Core.Detection;

namespace TrafficSignScanner.Services;

public sealed class ImageAnalysisWorkflow : IImageAnalysisWorkflow
{
    private readonly IDetectorProvider _detectorProvider;

    public ImageAnalysisWorkflow(IDetectorProvider detectorProvider)
    {
        _detectorProvider = detectorProvider ?? throw new ArgumentNullException(nameof(detectorProvider));
    }

    public async Task<ImageAnalysisWorkflowResult> AnalyzeAsync(
        byte[] imageBytes,
        int displayWidth,
        int displayHeight,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(imageBytes);

        var detector = await _detectorProvider.GetDetectorAsync(cancellationToken).ConfigureAwait(false);
        var result = await ImageAnalysisPipeline.AnalyzeAsync(
            detector,
            imageBytes,
            displayWidth,
            displayHeight,
            cancellationToken).ConfigureAwait(false);

        var statusMessage = DetectionStatusFormatter.FormatStatusMessage(result.Detections);
        return new ImageAnalysisWorkflowResult(result.AnnotatedPreviewPng, statusMessage);
    }
}
