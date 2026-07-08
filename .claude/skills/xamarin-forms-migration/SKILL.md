---
name: xamarin-forms-migration
description: >
  **WORKFLOW SKILL** - Guide for migrating Xamarin.Forms apps to .NET MAUI. Covers project structure
  decisions, SDK-style project conversion, namespace renames, layout behavior changes,
  renderer-to-handler migration, effects-to-behaviors redesign, Xamarin.Essentials
  namespace mapping, NuGet dependency compatibility, data migration, and common
  troubleshooting. Incorporates field-tested advice from production migrations.
  USE FOR: "migrate Xamarin.Forms", "upgrade to MAUI", "Xamarin to MAUI",
  "convert Xamarin.Forms project", "Forms migration", "namespace changes Xamarin",
  "renderer to handler", "effects to behaviors", "AndExpand replacement",
  "layout changes MAUI", "Xamarin.Essentials to MAUI".
  DO NOT USE FOR: migrating Xamarin.Android native apps (use xamarin-android-migration),
  migrating Xamarin.iOS native apps (use xamarin-ios-migration),
  creating new MAUI handlers from scratch (use maui-custom-handlers),
  performance optimization (use maui-performance).
---

# Xamarin.Forms → .NET MAUI Migration

For project templates, namespace tables, API deprecation tables, and reference code, see `references/forms-migration-api.md`.

> ⚠️ **Do not use the .NET Upgrade Assistant.** Apply namespace renames, project file updates, and package replacements directly. Build after each batch of changes and use compiler errors to guide the next round of fixes.

## Migration Workflow

1. Create new .NET MAUI project (**single-project** — multi-project causes AOT/build errors)
2. Copy cross-platform code + platform code into `Platforms/<platform>/`
3. Update namespaces (XAML + C# + Essentials — see `references/forms-migration-api.md`)
4. Fix layout behavior changes (see below)
5. Migrate renderers → handlers (not shimmed renderers)
6. Migrate effects → behaviors
7. **Remove** `Microsoft.Maui.Controls.Compatibility` package
8. Update NuGet dependencies
9. Migrate app data stores
10. Delete `bin/`/`obj/`/`Resource.designer.cs`, build, test iteratively
11. Verify against .NET 10 deprecated API list

> **Strategy:** Create a new project and copy code into it — don't edit the existing project file in place.

## Critical Layout Pitfalls

### ⚠️ Default Spacing Changed to Zero

MAUI zeroes out spacing that Xamarin.Forms set to 6. Your layouts **will break silently**:

```xml
<!-- ❌ Looks fine in Xamarin.Forms, cramped in MAUI -->
<Grid>...</Grid>
<StackLayout>...</StackLayout>

<!-- ✅ Add explicit values or restore via implicit styles in App.xaml -->
<Style TargetType="Grid">
    <Setter Property="ColumnSpacing" Value="6"/>
    <Setter Property="RowSpacing" Value="6"/>
</Style>
```

> **Field advice:** Specify all layout values explicitly — don't rely on platform defaults.

### ⚠️ `*AndExpand` Is Obsolete — No Silent Warning

```xml
<!-- ❌ Silently ignored in MAUI — image won't expand -->
<StackLayout>
    <Label Text="Hello world!"/>
    <Image VerticalOptions="FillAndExpand" Source="dotnetbot.png"/>
</StackLayout>

<!-- ✅ Convert to Grid with star sizing -->
<Grid RowDefinitions="Auto, *">
    <Label Text="Hello world!"/>
    <Image Grid.Row="1" Source="dotnetbot.png"/>
</Grid>
```

> **Field advice:** Flatten layout trees. Replace nested hierarchies with single Grid layouts.

### ⚠️ ScrollView in StackLayout Doesn't Scroll

ScrollView inside StackLayout expands to full content height (no scroll). Place `ScrollView` in a `Grid` with a constrained row instead.

### Other Layout Traps

| Issue | Fix |
|-------|-----|
| Grid columns/rows not declared → layout broken | Always add explicit `ColumnDefinitions`/`RowDefinitions` |
| `Frame` measures differently | Migrate to `Border` with `StrokeShape` |
| `BoxView` invisible (default 0×0 in MAUI) | Set explicit `WidthRequest`/`HeightRequest` |
| `RelativeLayout` | Replace with `Grid` (compatibility namespace only) |

## Renderer → Handler Migration

> ⚠️ **Migrate all renderers to handlers. Do NOT use shimmed renderers** — they create parent wrapper views that hurt performance.

**Preferred: Customize existing handlers with mapper methods:**

```csharp
// ✅ Extend existing handler — no new class needed
Microsoft.Maui.Handlers.EntryHandler.Mapper.AppendToMapping("NoBorder", (handler, view) =>
{
#if ANDROID
    handler.PlatformView.Background = null;
#elif IOS || MACCATALYST
    handler.PlatformView.BorderStyle = UIKit.UITextBorderStyle.None;
#endif
});
```

For completely new native views, create a full handler (see **maui-custom-handlers** skill).

## Effects → Behaviors

> ⚠️ **Effects are now Behaviors — this requires redesign, not just renaming.**

For new development, prefer behaviors or handler mapper customizations over effects.

## ⚠️ Do NOT Use the Compatibility Package

`Microsoft.Maui.Controls.Compatibility` causes cascading incompatibilities. Remove it and rebuild layouts natively.

## Retired Dependencies

- **App Center** is retired → Replace with Sentry, Azure Monitor, or similar
- **Visual Studio for Mac** is retired → Use VS Code or Rider

## Android-Specific Warnings

- Android migration is **significantly harder** than iOS — expect more UI bugs
- OEM-specific rendering differences not reproducible on emulators — **test on physical devices**
- Shadow rendering varies across OEMs/API levels — implement in platform-specific handler code
- Handler-level property changes don't auto-update on theme switch — manually handle theme changes

## .NET 10 API Currency Warning

Migration is the perfect time to skip deprecated APIs entirely. Don't migrate Xamarin.Forms code to a MAUI API that's already on its way out. See the full deprecated API table in `references/forms-migration-api.md` and run the **maui-current-apis** skill.

## Common Troubleshooting

| Issue | Fix |
|-------|-----|
| `Xamarin.*` namespace doesn't exist | Update to `Microsoft.Maui.*` equivalent |
| CollectionView doesn't scroll | Place in Grid (not StackLayout) to constrain size |
| Pop-up under page on iOS | Use `DisplayAlert` from the `ContentPage` |
| Missing padding/margin/spacing | Add explicit values or implicit styles |
| Custom renderer broken | Migrate to handler |
| SkiaSharp broken | Update to `SkiaSharp.Views.Maui` package |
| Can't access App.Properties data | Migrate to `Preferences` |

## Quick Checklist

1. ☐ Created new .NET MAUI project (single-project)
2. ☐ Copied cross-platform and platform code
3. ☐ Updated XAML namespace to `http://schemas.microsoft.com/dotnet/2021/maui`
4. ☐ Replaced `Xamarin.Forms.*` → `Microsoft.Maui.*` namespaces
5. ☐ Replaced `Xamarin.Essentials` → split MAUI namespaces
6. ☐ Added explicit Grid `ColumnDefinitions`/`RowDefinitions`
7. ☐ Replaced `*AndExpand` with Grid layouts
8. ☐ Added explicit spacing/padding values (MAUI defaults to 0)
9. ☐ Migrated renderers to handlers (not shimmed renderers)
10. ☐ Migrated effects to behaviors or MAUI effects
11. ☐ Removed `Microsoft.Maui.Controls.Compatibility` package
12. ☐ Updated NuGet dependencies for .NET compatibility
13. ☐ Migrated App.Properties, SecureStorage, VersionTracking data
14. ☐ Deleted `bin/`, `obj/`, and `Resource.designer.cs`
15. ☐ Tested on physical Android device
16. ☐ Profiled performance
17. ☐ Verified no .NET 10 deprecated APIs (run **maui-current-apis** skill)
