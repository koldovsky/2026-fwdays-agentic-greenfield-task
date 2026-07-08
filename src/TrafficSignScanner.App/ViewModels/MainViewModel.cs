using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TrafficSignScanner.Services;

namespace TrafficSignScanner.ViewModels;

public partial class MainViewModel : ObservableObject
{
    public const string CameraBlockedStatusMessage = "Camera unavailable or permission denied.";
    public const string InitialStatusMessage = "Capture or pick a photo to scan traffic signs.";

    private readonly IImageInputService _imageInputService;
    private readonly IImageAnalysisWorkflow _analysisWorkflow;
    private readonly IMainThreadDispatcher _mainThreadDispatcher;
    private int _activeAnalysisCount;

    public MainViewModel(
        IImageInputService imageInputService,
        IImageAnalysisWorkflow analysisWorkflow,
        IMainThreadDispatcher mainThreadDispatcher)
    {
        _imageInputService = imageInputService ?? throw new ArgumentNullException(nameof(imageInputService));
        _analysisWorkflow = analysisWorkflow ?? throw new ArgumentNullException(nameof(analysisWorkflow));
        _mainThreadDispatcher = mainThreadDispatcher ?? throw new ArgumentNullException(nameof(mainThreadDispatcher));
        _statusMessage = InitialStatusMessage;
    }

    [ObservableProperty]
    private byte[]? _previewImageBytes;

    [ObservableProperty]
    private string _statusMessage;

    [ObservableProperty]
    private bool _isBusy;

    [RelayCommand(CanExecute = nameof(CanAnalyze))]
    private async Task CapturePhotoAsync()
    {
        var imageBytes = await _imageInputService.CapturePhotoAsync(CancellationToken.None).ConfigureAwait(false);
        if (imageBytes is null)
        {
            await UpdateStatusMessageAsync(CameraBlockedStatusMessage).ConfigureAwait(false);
            return;
        }

        await AnalyzeImageAsync(imageBytes).ConfigureAwait(false);
    }

    [RelayCommand(CanExecute = nameof(CanAnalyze))]
    private async Task PickPhotoAsync()
    {
        var imageBytes = await _imageInputService.PickPhotoAsync(CancellationToken.None).ConfigureAwait(false);
        if (imageBytes is null)
        {
            return;
        }

        await AnalyzeImageAsync(imageBytes).ConfigureAwait(false);
    }

    private async Task AnalyzeImageAsync(byte[] imageBytes)
    {
        if (!await TryBeginAnalysisAsync().ConfigureAwait(false))
        {
            return;
        }

        try
        {
            await _mainThreadDispatcher.InvokeAsync(() => PreviewImageBytes = imageBytes).ConfigureAwait(false);

            var result = await Task.Run(
                () => _analysisWorkflow.AnalyzeAsync(
                    imageBytes,
                    displayWidth: 0,
                    displayHeight: 0,
                    CancellationToken.None),
                CancellationToken.None).ConfigureAwait(false);

            await _mainThreadDispatcher.InvokeAsync(() =>
            {
                if (result.AnnotatedPreviewPng is { Length: > 0 })
                {
                    PreviewImageBytes = result.AnnotatedPreviewPng;
                }

                StatusMessage = result.StatusMessage;
            }).ConfigureAwait(false);
        }
        catch (Exception)
        {
            await UpdateStatusMessageAsync("Analysis failed. Please try another photo.").ConfigureAwait(false);
        }
        finally
        {
            await EndAnalysisAsync().ConfigureAwait(false);
        }
    }

    private async Task<bool> TryBeginAnalysisAsync()
    {
        if (Interlocked.CompareExchange(ref _activeAnalysisCount, 1, 0) != 0)
        {
            return false;
        }

        await _mainThreadDispatcher.InvokeAsync(() =>
        {
            IsBusy = true;
            NotifyAnalyzeCommandsCanExecuteChanged();
        }).ConfigureAwait(false);

        return true;
    }

    private Task EndAnalysisAsync()
    {
        Interlocked.Exchange(ref _activeAnalysisCount, 0);
        return _mainThreadDispatcher.InvokeAsync(() =>
        {
            IsBusy = false;
            NotifyAnalyzeCommandsCanExecuteChanged();
        });
    }

    private bool CanAnalyze() => !IsBusy;

    private Task UpdateStatusMessageAsync(string message)
        => _mainThreadDispatcher.InvokeAsync(() => StatusMessage = message);

    partial void OnIsBusyChanged(bool value) => NotifyAnalyzeCommandsCanExecuteChanged();

    private void NotifyAnalyzeCommandsCanExecuteChanged()
    {
        CapturePhotoCommand.NotifyCanExecuteChanged();
        PickPhotoCommand.NotifyCanExecuteChanged();
    }
}
