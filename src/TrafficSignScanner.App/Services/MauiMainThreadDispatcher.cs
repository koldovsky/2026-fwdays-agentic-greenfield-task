namespace TrafficSignScanner.Services;

public sealed class MauiMainThreadDispatcher : IMainThreadDispatcher
{
    public Task InvokeAsync(Action action)
        => MainThread.InvokeOnMainThreadAsync(action);
}
