---
name: maui-maps
description: >
  Guidance for adding map controls, pins, polygons, polylines, geocoding,
  Google Maps API key configuration, and platform setup in .NET MAUI apps
  using Microsoft.Maui.Controls.Maps.
  USE FOR: "add map", "map control", "map pins", "polygons on map", "polylines",
  "geocoding", "Google Maps API key", "Microsoft.Maui.Controls.Maps", "map setup",
  "reverse geocoding", "map region".
  DO NOT USE FOR: getting device GPS coordinates (use maui-geolocation),
  custom drawing overlays (use maui-graphics-drawing), or location permissions only (use maui-permissions).
---

# .NET MAUI Maps

## Common gotchas

| Issue | Fix |
|---|---|
| Map is blank on Android | Google Maps API key missing or wrong in `AndroidManifest.xml` |
| Map crashes on startup | `.UseMauiMaps()` not called in `MauiProgram.cs` |
| `Map` type ambiguous | Conflicts with `Microsoft.Maui.ApplicationModel.Map` — add namespace alias |
| Map doesn't show on Windows | Windows has no native support — must use `CommunityToolkit.Maui.Maps` |
| User location dot missing | `IsShowingUser="True"` set but location permission not granted |
| Android 11+ can't launch external map app | Missing `<queries>` for `geo` scheme in manifest |

## ⚠️ Name conflict — always alias

`Microsoft.Maui.Controls.Maps.Map` conflicts with `Microsoft.Maui.ApplicationModel.Map`. This causes confusing compile errors.

```csharp
// ✅ Correct — explicit alias
using Map = Microsoft.Maui.Controls.Maps.Map;
```

```xml
<!-- ✅ Correct — namespace prefix in XAML -->
xmlns:maps="clr-namespace:Microsoft.Maui.Controls.Maps;assembly=Microsoft.Maui.Controls.Maps"
<maps:Map ... />

<!-- ❌ Wrong — bare <Map> is ambiguous -->
<Map ... />
```

## Platform setup pitfalls

### Android — API key must be inside `<application>`

```xml
<!-- ✅ Correct -->
<application ...>
  <meta-data android:name="com.google.android.geo.API_KEY"
             android:value="YOUR_GOOGLE_MAPS_KEY" />
</application>

<!-- ❌ Outside <application> — key is silently ignored -->
```

⚠️ Also required: Google Play Services version meta-data and `<queries>` for geo scheme on API 30+ (see `references/maps-api.md`).

### iOS / Mac Catalyst

⚠️ Without `NSLocationWhenInUseUsageDescription` in `Info.plist`, location permission is denied without prompt.

### Windows — no native support

Must add `CommunityToolkit.Maui.Maps` + Bing key. Use conditional package reference and `#if WINDOWS` for setup.

## MauiProgram.cs — don't forget UseMauiMaps

```csharp
// ✅ Required — without this, Map control throws at runtime
builder.UseMauiMaps();

// ❌ Forgetting this causes "No registered handler for Map" crash
```

## Performance tips

- ⚠️ **Don't add hundreds of pins directly** — use `ItemsSource` with data binding for large pin sets.
- **Set initial region** with `MoveToRegion()` to avoid the default world view zoom animation.
- **Avoid frequent `MoveToRegion()` calls** — each triggers a map animation; debounce if driven by data changes.

## Data-bound pins — do this for dynamic data

```xml
<!-- ✅ Correct — data-bound pins for dynamic collections -->
<maps:Map ItemsSource="{Binding Locations}">
    <maps:Map.ItemTemplate>
        <DataTemplate>
            <maps:Pin Label="{Binding Name}"
                      Address="{Binding Description}"
                      Location="{Binding Position}" />
        </DataTemplate>
    </maps:Map.ItemTemplate>
</maps:Map>

<!-- ❌ Wrong — manually adding pins in code-behind for data-driven scenarios -->
```

## Decision framework

| Need | Approach |
|---|---|
| Basic map with pins | `Map` control + `Pins.Add()` or `ItemsSource` binding |
| Map with shapes | `MapElements` — `Polygon`, `Polyline`, `Circle` |
| Address → coordinates | `Geocoding.Default.GetLocationsAsync(address)` |
| Coordinates → address | `Geocoding.Default.GetPlacemarksAsync(lat, lon)` |
| Custom map overlays | Use handlers to access native map APIs |
| Windows support | Must add `CommunityToolkit.Maui.Maps` + Bing key |

## Quick checklist

- [ ] NuGet: `Microsoft.Maui.Controls.Maps` added
- [ ] `.UseMauiMaps()` called in `MauiProgram.cs`
- [ ] Android: Google Maps API key inside `<application>` in `AndroidManifest.xml`
- [ ] Android: Google Play Services version meta-data present
- [ ] Android 11+: `<queries>` for geo scheme added
- [ ] iOS/Mac: `NSLocationWhenInUseUsageDescription` in `Info.plist`
- [ ] Windows: `CommunityToolkit.Maui.Maps` + Bing Maps key (conditional)
- [ ] Namespace alias added to avoid `Map` type conflict
