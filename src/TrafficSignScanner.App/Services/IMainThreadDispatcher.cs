namespace TrafficSignScanner.Services;

public interface IMainThreadDispatcher
{
    Task InvokeAsync(Action action);
}
