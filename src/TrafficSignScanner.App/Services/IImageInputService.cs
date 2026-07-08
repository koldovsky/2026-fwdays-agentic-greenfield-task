namespace TrafficSignScanner.Services;

public interface IImageInputService
{
    /// <summary>@trace FR-CAPTURE-01</summary>
    Task<byte[]?> CapturePhotoAsync(CancellationToken cancellationToken = default);

    /// <summary>@trace FR-PICK-01</summary>
    Task<byte[]?> PickPhotoAsync(CancellationToken cancellationToken = default);
}
