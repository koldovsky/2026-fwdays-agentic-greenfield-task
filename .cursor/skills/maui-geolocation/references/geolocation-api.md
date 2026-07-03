# Geolocation API Reference

## Platform Permissions

### Android

Add to `Platforms/Android/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<!-- Android 10+ background location (only if needed) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### iOS

Add to `Platforms/iOS/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs your location to provide nearby results.</string>
```

For full-accuracy prompts on iOS 14+, also add:

```xml
<key>NSLocationTemporaryUsageDescriptionDictionary</key>
<dict>
  <key>FullAccuracyUsageKey</key>
  <string>This app needs precise location for turn-by-turn directions.</string>
</dict>
```

### macOS (Mac Catalyst)

Add to `Platforms/MacCatalyst/Entitlements.plist`:

```xml
<key>com.apple.security.personal-information.location</key>
<true/>
```

### Windows

No manifest changes required. Location capability is enabled by default.

## Core API — `Geolocation.Default`

| Method | Returns | Purpose |
|--------|---------|---------|
| `GetLastKnownLocationAsync()` | `Location?` | Cached device location (fast, may be stale) |
| `GetLocationAsync(GeolocationRequest, CancellationToken)` | `Location?` | Fresh GPS fix with desired accuracy |
| `StartListeningForegroundAsync(GeolocationListeningRequest)` | `bool` | Begin continuous location updates |
| `StopListeningForeground()` | `void` | Stop continuous updates |

## One-Shot Location

```csharp
try
{
    var request = new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(10));
    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
    var location = await Geolocation.Default.GetLocationAsync(request, cts.Token);

    if (location is null)
    {
        // Location unavailable — GPS off, permissions denied, or timeout
        return;
    }

    Console.WriteLine($"{location.Latitude}, {location.Longitude} ±{location.Accuracy}m");
}
catch (FeatureNotSupportedException)
{
    // Device lacks GPS hardware
}
catch (PermissionException)
{
    // Location permission not granted
}
```

## Continuous Listening

```csharp
public partial class TrackingViewModel : ObservableObject
{
    [ObservableProperty] Location? currentLocation;

    public async Task StartTracking()
    {
        Geolocation.Default.LocationChanged += OnLocationChanged;
        var request = new GeolocationListeningRequest(GeolocationAccuracy.High, TimeSpan.FromSeconds(5));
        var success = await Geolocation.Default.StartListeningForegroundAsync(request);
        if (!success)
            Geolocation.Default.LocationChanged -= OnLocationChanged;
    }

    public void StopTracking()
    {
        Geolocation.Default.StopListeningForeground();
        Geolocation.Default.LocationChanged -= OnLocationChanged;
    }

    void OnLocationChanged(object? sender, GeolocationLocationChangedEventArgs e)
    {
        CurrentLocation = e.Location;
    }
}
```

## GeolocationAccuracy Levels

| Enum value | Android (m) | iOS (m) | Windows (m) |
|------------|-------------|---------|-------------|
| `Lowest` | 500 | 3000 | 1000–5000 |
| `Low` | 500 | 1000 | 300–3000 |
| `Medium` | 100–500 | 100 | 30–500 |
| `High` | 0–100 | 10 | ≤30 |
| `Best` | 0–100 | ~0 | ≤10 |

## DI-Friendly Service Wrapper

Register `IGeolocation` in `MauiProgram.cs`:

```csharp
builder.Services.AddSingleton<IGeolocation>(Geolocation.Default);
builder.Services.AddSingleton<LocationService>();
```

Consume via constructor injection:

```csharp
public class LocationService(IGeolocation geolocation)
{
    public async Task<Location?> GetCurrentAsync(CancellationToken ct = default)
    {
        var cached = await geolocation.GetLastKnownLocationAsync();
        if (cached is not null && cached.Timestamp > DateTimeOffset.UtcNow.AddMinutes(-5))
            return cached;

        return await geolocation.GetLocationAsync(
            new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(10)), ct);
    }
}
```
