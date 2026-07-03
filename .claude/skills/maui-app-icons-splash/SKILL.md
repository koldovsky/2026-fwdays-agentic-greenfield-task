---
name: maui-app-icons-splash
description: >
  .NET MAUI app icon configuration, splash screen setup, SVG to PNG conversion
  at build time, composed/adaptive icons, and platform-specific icon and splash
  screen requirements for Android, iOS, Mac Catalyst, and Windows.
  USE FOR: "app icon", "splash screen", "MauiIcon", "MauiSplashScreen", "adaptive icon",
  "change app icon", "launch screen", "SVG icon", "foreground tint", "icon resize".
  DO NOT USE FOR: in-app images or image loading (use maui-performance),
  theming or colors (use maui-theming), or custom drawing (use maui-graphics-drawing).
---

# .NET MAUI App Icons & Splash Screens

## Common Pitfalls

### ❌ Android adaptive icon clipping

Android adaptive icons crop to a circular or squircle safe zone. If the foreground fills the canvas, it **will** be clipped.

```xml
<!-- ❌ Single-layer icon — foreground fills entire canvas, gets clipped -->
<MauiIcon Include="Resources\AppIcon\appicon.svg"
          Color="#512BD4" />

<!-- ✅ Composed icon with scaled foreground — stays in safe zone -->
<MauiIcon Include="Resources\AppIcon\appicon.svg"
          ForegroundFile="Resources\AppIcon\appiconfg.svg"
          ForegroundScale="0.65"
          Color="#512BD4" />
```

### ❌ Transparent splash screen Color

Some platforms ignore alpha in the splash `Color` and show **black** instead.

```xml
<!-- ❌ Transparent color — may render as black on some platforms -->
<MauiSplashScreen Include="Resources\Splash\splash.svg"
                  Color="#00FFFFFF" />

<!-- ✅ Opaque color -->
<MauiSplashScreen Include="Resources\Splash\splash.svg"
                  Color="#512BD4" />
```

### ❌ Confusing Color vs TintColor

- **`Color`** = background fill behind the icon/splash.
- **`TintColor`** = recolors the foreground image itself.

Setting only `TintColor` without visible foreground paths results in a blank icon.

### ⚠️ SVG rendering issues at build time

Complex SVGs with gradients, filters, or masks may not rasterize correctly via the `Microsoft.Maui.Resizetizer` MSBuild task.

```xml
<!-- Workaround: supply a pre-made PNG and skip resizing -->
<MauiIcon Include="Resources\AppIcon\appicon.png"
          Resize="false" />
```

### ⚠️ BaseSize mismatch

If your SVG `viewBox` doesn't match the desired logical size, set `BaseSize` explicitly — otherwise the output dimensions may be wrong.

```xml
<!-- SVG viewBox is 100x100 but you want 456x456 logical output -->
<MauiIcon Include="Resources\AppIcon\appicon.svg"
          BaseSize="456,456"
          Color="#512BD4" />
```

## Best Practices

1. **Use SVG whenever possible** — one file, infinite scaling, smaller repo.
2. **Set `BaseSize` explicitly** when the SVG viewBox doesn't match the desired logical size.
3. **Keep splash images simple** — large or complex SVGs slow the build and may render with artifacts.
4. **Test on real devices** — emulator densities mask icon cropping, especially Android adaptive icon safe zones.
5. **Use composed icons for Android** — `ForegroundFile` + `ForegroundScale="0.65"` ensures the foreground stays within the safe zone.

## Quick Troubleshooting

| Symptom | Likely fix |
|---|---|
| Icon appears blank or white | Check `Color` vs `TintColor`; ensure SVG paths exist |
| Splash shows default .NET logo | Verify `MauiSplashScreen` item is in the `.csproj` |
| Android icon looks clipped | Use composed icon with `ForegroundScale="0.65"` |
| Build error on SVG | Simplify SVG or switch to PNG with `Resize="false"` |
| Icon wrong size on one platform | Set `BaseSize` explicitly in the `.csproj` |

## Checklist

- [ ] `MauiIcon` item exists in `.csproj` with `Color` set
- [ ] `MauiSplashScreen` item exists in `.csproj` with `Color` and `BaseSize`
- [ ] Android: using composed icon with `ForegroundScale` for safe zone compliance
- [ ] SVG sources are simple (no gradients/filters) or PNG fallback with `Resize="false"`
- [ ] Tested on a real device (not just emulator) for density and cropping
