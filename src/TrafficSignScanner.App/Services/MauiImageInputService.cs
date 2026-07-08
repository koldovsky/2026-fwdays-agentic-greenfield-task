namespace TrafficSignScanner.Services;

public sealed class MauiImageInputService : IImageInputService
{
    public async Task<byte[]?> CapturePhotoAsync(CancellationToken cancellationToken = default)
    {
        var permissionStatus = await Permissions.RequestAsync<Permissions.Camera>().ConfigureAwait(true);
        if (permissionStatus != PermissionStatus.Granted)
        {
            return null;
        }

        if (!MediaPicker.Default.IsCaptureSupported)
        {
            return null;
        }

        var captureResult = await MediaPicker.Default.CapturePhotoAsync(
            new MediaPickerOptions { Title = "Capture traffic sign" }).ConfigureAwait(true);

        if (captureResult is null)
        {
            return null;
        }

        return await ReadAllBytesAsync(captureResult, cancellationToken, preferMainThread: true).ConfigureAwait(true);
    }

    public async Task<byte[]?> PickPhotoAsync(CancellationToken cancellationToken = default)
    {
        var pickResults = await MediaPicker.Default.PickPhotosAsync(
            new MediaPickerOptions { Title = "Select traffic sign photo" }).ConfigureAwait(true);

        var pickResult = pickResults?.FirstOrDefault();
        if (pickResult is null)
        {
            return null;
        }

        return await ReadAllBytesAsync(pickResult, cancellationToken).ConfigureAwait(true);
    }

    private static async Task<byte[]?> ReadAllBytesAsync(
        FileResult fileResult,
        CancellationToken cancellationToken,
        bool preferMainThread = false)
    {
        var continueOnCapturedContext = preferMainThread;
        await using var stream = await fileResult.OpenReadAsync().ConfigureAwait(continueOnCapturedContext);
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken).ConfigureAwait(continueOnCapturedContext);

        var bytes = buffer.ToArray();
        return bytes.Length == 0 ? null : bytes;
    }
}
