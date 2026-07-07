namespace TrafficSignScanner.Services;

public sealed record ImageAnalysisWorkflowResult(
    byte[] AnnotatedPreviewPng,
    string StatusMessage);

public interface IImageAnalysisWorkflow
{
    /// <summary>@trace NFR-PERF-01, NFR-STARTUP-01, FR-OVERLAY-02</summary>
    Task<ImageAnalysisWorkflowResult> AnalyzeAsync(
        byte[] imageBytes,
        int displayWidth,
        int displayHeight,
        CancellationToken cancellationToken = default);
}
