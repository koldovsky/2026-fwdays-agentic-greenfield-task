---
name: maui-theming
description: >
  Guide for theming .NET MAUI apps—light/dark mode support, AppThemeBinding,
  dynamic resources, ResourceDictionary theme switching, and system theme detection.
  USE FOR: "dark mode", "light mode", "theming", "AppThemeBinding", "theme switching",
  "ResourceDictionary theme", "dynamic resources", "system theme detection",
  "color scheme", "app theme".
  DO NOT USE FOR: localization or language switching (use maui-localization),
  accessibility visual adjustments (use maui-accessibility), or app icons (use maui-app-icons-splash).
---

# .NET MAUI Theming

## Choosing your approach

| Approach | Best for | Limitation |
|----------|----------|------------|
| **AppThemeBinding** | Auto light/dark with OS — minimal code | Only two themes (light + dark) |
| **ResourceDictionary swap** | Custom branded themes, >2 themes, user preference | More setup, must use `DynamicResource` everywhere |
| **Both combined** | Auto OS response + custom theme colors | Most flexible but most complex |

## Critical gotchas

### Android: ConfigChanges.UiMode is REQUIRED

`MainActivity` **must** include `ConfigChanges.UiMode` or theme change events will
not fire and the activity restarts instead of handling the change:

```csharp
[Activity(Theme = "@style/Maui.SplashTheme",
          MainLauncher = true,
          ConfigurationChanges = ConfigChanges.ScreenSize
                               | ConfigChanges.Orientation
                               | ConfigChanges.UiMode  // ← Required for theme detection
                               | ConfigChanges.ScreenLayout
                               | ConfigChanges.SmallestScreenSize
                               | ConfigChanges.Density)]
public class MainActivity : MauiAppCompatActivity { }
```

Without `UiMode`, toggling dark mode in Android settings causes a full activity
restart — losing navigation state and appearing as a crash to users.

### CSS themes cannot be swapped at runtime

MAUI supports CSS styling, but CSS-based themes **cannot be swapped dynamically**.
Use ResourceDictionary theming for runtime switching.

### DynamicResource vs StaticResource

When using ResourceDictionary theme switching, you **must** use `DynamicResource`:

```xml
<!-- ✅ Updates when theme dictionary changes -->
<Label TextColor="{DynamicResource PrimaryTextColor}" />

<!-- ❌ Frozen at first load — won't update on theme switch -->
<Label TextColor="{StaticResource PrimaryTextColor}" />
```

## Quick reference

- **OS light/dark** → `AppThemeBinding` markup extension
- **Theme colors in C#** → `SetAppThemeColor()`, `SetAppTheme<T>()`
- **Read OS theme** → `Application.Current.RequestedTheme`
- **Force theme** → `Application.Current.UserAppTheme = AppTheme.Dark`
- **Theme changes** → `RequestedThemeChanged` event
- **Custom switching** → Swap `ResourceDictionary` in `MergedDictionaries`
- **Runtime bindings** → **`DynamicResource`** (not `StaticResource`)
