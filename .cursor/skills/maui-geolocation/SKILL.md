---
name: maui-geolocation
description: >
  Add geolocation capabilities to .NET MAUI apps using Microsoft.Maui.Devices.Sensors.
  Covers one-shot and continuous location, platform permissions (Android, iOS, macOS, Windows),
  accuracy levels, CancellationToken usage, mock-location detection, and a DI-friendly service wrapper.
  USE FOR: "geolocation", "GPS location", "get current location", "location permission",
  "continuous location", "location tracking", "GeolocationRequest", "mock location",
  "latitude longitude MAUI".
  DO NOT USE FOR: displaying locations on a map (use maui-maps),
  general permission handling (use maui-permissions), or geocoding addresses (use maui-maps).
---

# .NET MAUI Geolocation

## Critical: Always Pass a CancellationToken

`GetLocationAsync` can hang indefinitely if GPS is off, the device is indoors,
or permissions are in a pending state. Always set a timeout.

```csharp
// ❌ Hangs forever if no GPS fix is available
var location = await Geolocation.Default.GetLocationAsync(
    new GeolocationRequest(GeolocationAccuracy.High));

// ✅ Times out after 30 seconds
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var location = await Geolocation.Default.GetLocationAsync(
    new GeolocationRequest(GeolocationAccuracy.High), cts.Token);
```

---

## Accuracy vs. Battery Trade-off

Use the **lowest accuracy** that satisfies your feature. Higher accuracy
drains battery significantly faster — especially on Android.

| Use case | Recommended accuracy |
|---|---|
| City-level / weather | `Lowest` or `Low` |
| Nearby search / store finder | `Medium` |
| Turn-by-turn navigation | `High` or `Best` |

---

## Platform Gotchas

### iOS 14 reduced accuracy

Users can grant "approximate" location (accuracy > 1 km). Your app receives
a location, but it may be useless for precision features.

- Check `location.Accuracy` — values > 100 m likely indicate reduced precision.
- Use `GeolocationRequest.RequestFullAccuracy` with a key matching
  `NSLocationTemporaryUsageDescriptionDictionary` in `Info.plist` to
  prompt for full accuracy.

### Android: mock locations in security-sensitive flows

```csharp
// ⚠️ Always check in security-sensitive flows (e.g., geofence, check-in)
if (location.IsFromMockProvider)
{
    // Reject — user is spoofing location
}
```

### Android: `Altitude` 0.0 is not sea level

Some Android devices return `0.0` for `Altitude` when the GPS has no
barometric sensor. Treat `0.0` as **"unknown"**, not sea level.

### Android 10+: background location requires separate permission

`ACCESS_BACKGROUND_LOCATION` must be requested **separately** from foreground
permissions and triggers a distinct system dialog. Requesting it together with
foreground permissions causes both to be denied on some devices.

### `GetLastKnownLocationAsync` returns `null`

This is expected on first boot or after a location-data reset. Always fall
back to `GetLocationAsync`:

```csharp
// ✅ Cache-first with fresh fallback
var location = await geolocation.GetLastKnownLocationAsync();
if (location is null || location.Timestamp < DateTimeOffset.UtcNow.AddMinutes(-5))
{
    location = await geolocation.GetLocationAsync(
        new GeolocationRequest(GeolocationAccuracy.Medium, TimeSpan.FromSeconds(10)), ct);
}
```

### Permissions must be requested before any geolocation call

Call `Permissions.RequestAsync<Permissions.LocationWhenInUse>()` first, or
catch `PermissionException`. Calling `GetLocationAsync` without permission
throws on some platforms and returns `null` on others — inconsistent
behaviour across platforms.

---

## Continuous Listening: Don't Forget to Unsubscribe

Failing to remove the `LocationChanged` handler when stopping causes
continued GPS usage and battery drain.

```csharp
// ❌ Forgetting to unsubscribe — GPS stays active
public void StopTracking()
{
    Geolocation.Default.StopListeningForeground();
    // LocationChanged handler still fires!
}

// ✅ Always remove the event handler
public void StopTracking()
{
    Geolocation.Default.StopListeningForeground();
    Geolocation.Default.LocationChanged -= OnLocationChanged;
}
```

---

## Checklist

- [ ] `CancellationToken` passed to every `GetLocationAsync` call
- [ ] Accuracy level matched to feature need (not blindly set to `Best`)
- [ ] `GetLastKnownLocationAsync` null-check with `GetLocationAsync` fallback
- [ ] Runtime permissions requested before first geolocation call
- [ ] `LocationChanged` handler removed when stopping continuous listening
- [ ] Android: `ACCESS_BACKGROUND_LOCATION` requested separately (if needed)
- [ ] iOS: `NSLocationTemporaryUsageDescriptionDictionary` added for full-accuracy prompt
- [ ] Android: `IsFromMockProvider` checked in security-sensitive flows
