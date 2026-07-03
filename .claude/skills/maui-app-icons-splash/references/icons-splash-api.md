# .NET MAUI App Icons & Splash Screens — API Reference

## App Icons

### Single-source icon

Add one `MauiIcon` item in the `.csproj`; the build resizes it for every platform:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.svg"
          Color="#512BD4" />
```

- **Source**: SVG (recommended) or PNG. SVGs are converted to platform PNGs at build.
- **Color**: Background fill behind the icon (hex or named color).
- **BaseSize**: Logical size before platform scaling (default `456,456` for icons).
- **TintColor**: Recolors the foreground of a single-layer icon.

### Composed / layered icons

Use `Include` (background) + `ForegroundFile` (foreground) for a two-layer icon:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.svg"
          ForegroundFile="Resources\AppIcon\appiconfg.svg"
          ForegroundScale="0.65"
          Color="#512BD4" />
```

- **ForegroundFile**: SVG/PNG overlaid on the background.
- **ForegroundScale**: Scale factor for the foreground layer (0.0–1.0).
- Composed icons automatically produce **Android adaptive icons** (API 26+).

### Platform-specific references

| Platform      | Where the icon is referenced                                   |
|---------------|----------------------------------------------------------------|
| Android       | `AndroidManifest.xml` → `android:icon="@mipmap/appicon"`      |
| iOS / Mac Cat | `Info.plist` → `XSAppIconAssets = "Assets.xcassets/appicon.appiconset"` |
| Windows       | Auto-configured via the build; no manual reference needed      |

### Sizing guidelines

- Provide the largest resolution you need; the tooling scales down.
- For SVG sources, `BaseSize` controls the logical canvas size.
- Android generates `mdpi` through `xxxhdpi` variants automatically.
- iOS generates all required `@1x`, `@2x`, `@3x` sizes.

---

## Splash Screens

### Basic splash screen

Add one `MauiSplashScreen` item in the `.csproj`:

```xml
<MauiSplashScreen Include="Resources\Splash\splash.svg"
                  Color="#512BD4"
                  BaseSize="128,128" />
```

- **Color**: Background color of the splash screen.
- **BaseSize**: Logical size of the splash image (default `128,128`).
- **TintColor**: Recolors the splash image foreground.

### Platform behavior

**Android (12+)**
- The splash icon is centered on a colored background.
- Uses `@style/Maui.SplashTheme` set in `AndroidManifest.xml`:
  ```xml
  <activity android:theme="@style/Maui.SplashTheme" ... />
  ```
- Pre-Android 12 uses the same theme with a legacy splash.

**iOS / Mac Catalyst**
- Build generates `MauiSplash.storyboard` in the app bundle.
- Referenced automatically in `Info.plist` (`UILaunchStoryboardName`).

**Windows**
- The splash image is embedded in the app package; no extra config needed.

### SVG to PNG conversion

- All SVG sources (`MauiIcon`, `MauiSplashScreen`, `MauiImage`) are rasterized
  to PNGs at build time by the `Microsoft.Maui.Resizetizer` MSBuild task.
- Conversion respects `BaseSize`, `TintColor`, and `Color` properties.
- To skip resizing for a pre-made PNG, set `Resize="false"`.
- If an SVG renders incorrectly, simplify paths or supply a PNG instead.
