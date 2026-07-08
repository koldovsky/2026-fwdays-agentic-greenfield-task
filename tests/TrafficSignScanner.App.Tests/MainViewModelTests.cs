using TrafficSignScanner.Services;
using TrafficSignScanner.ViewModels;

namespace TrafficSignScanner.App.Tests;

public sealed class MainViewModelTests
{
    /// <summary>@trace FR-CAPTURE-01</summary>
    [Fact]
    public async Task CapturePhotoAsync_WhenBlocked_SetsStatusWithoutRunningAnalysis()
    {
        var input = new FakeImageInputService { CaptureResult = null };
        var workflow = new FakeImageAnalysisWorkflow();
        var dispatcher = new SyncMainThreadDispatcher();
        var viewModel = new MainViewModel(input, workflow, dispatcher);

        await viewModel.CapturePhotoCommand.ExecuteAsync(null);

        Assert.Equal(MainViewModel.CameraBlockedStatusMessage, viewModel.StatusMessage);
        Assert.Equal(0, workflow.CallCount);
    }

    /// <summary>@trace FR-PICK-01</summary>
    [Fact]
    public async Task PickPhotoAsync_WhenCancelled_PreservesStatusWithoutRunningAnalysis()
    {
        var input = new FakeImageInputService { PickResult = null };
        var workflow = new FakeImageAnalysisWorkflow();
        var dispatcher = new SyncMainThreadDispatcher();
        var viewModel = new MainViewModel(input, workflow, dispatcher)
        {
            StatusMessage = "Existing result",
        };

        await viewModel.PickPhotoCommand.ExecuteAsync(null);

        Assert.Equal("Existing result", viewModel.StatusMessage);
        Assert.Equal(0, workflow.CallCount);
    }

    /// <summary>@trace FR-OVERLAY-02, NFR-PERF-01</summary>
    [Fact]
    public async Task PickPhotoAsync_WhenImageSelected_UpdatesStatusFromWorkflow()
    {
        var input = new FakeImageInputService { PickResult = [0x01, 0x02, 0x03] };
        var workflow = new FakeImageAnalysisWorkflow
        {
            Result = new ImageAnalysisWorkflowResult([0x89, 0x50], "stop-sign (92%)"),
        };
        var dispatcher = new SyncMainThreadDispatcher();
        var viewModel = new MainViewModel(input, workflow, dispatcher);

        await viewModel.PickPhotoCommand.ExecuteAsync(null);

        Assert.Equal("stop-sign (92%)", viewModel.StatusMessage);
        Assert.Equal(1, workflow.CallCount);
        Assert.NotNull(viewModel.PreviewImageBytes);
    }

    /// <summary>@trace NFR-PERF-01</summary>
    [Fact]
    public async Task AnalyzeCommands_WhenBusy_DoNotStartSecondAnalysis()
    {
        var input = new FakeImageInputService { PickResult = [0x01] };
        var workflow = new FakeImageAnalysisWorkflow { Delay = TimeSpan.FromMilliseconds(200) };
        var dispatcher = new SyncMainThreadDispatcher();
        var viewModel = new MainViewModel(input, workflow, dispatcher);

        var first = viewModel.PickPhotoCommand.ExecuteAsync(null);
        await viewModel.CapturePhotoCommand.ExecuteAsync(null);

        await first;

        Assert.Equal(1, workflow.CallCount);
    }

    private sealed class FakeImageInputService : IImageInputService
    {
        public byte[]? CaptureResult { get; init; }

        public byte[]? PickResult { get; init; }

        public Task<byte[]?> CapturePhotoAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(CaptureResult);

        public Task<byte[]?> PickPhotoAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(PickResult);
    }

    private sealed class FakeImageAnalysisWorkflow : IImageAnalysisWorkflow
    {
        public int CallCount { get; private set; }

        public TimeSpan Delay { get; init; }

        public ImageAnalysisWorkflowResult Result { get; init; } =
            new([0x89, 0x50], "No supported traffic sign detected.");

        public async Task<ImageAnalysisWorkflowResult> AnalyzeAsync(
            byte[] imageBytes,
            int displayWidth,
            int displayHeight,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            if (Delay > TimeSpan.Zero)
            {
                await Task.Delay(Delay, cancellationToken);
            }

            return Result;
        }
    }

    private sealed class SyncMainThreadDispatcher : IMainThreadDispatcher
    {
        public Task InvokeAsync(Action action)
        {
            action();
            return Task.CompletedTask;
        }
    }
}
