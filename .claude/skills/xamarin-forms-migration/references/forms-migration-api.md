# Xamarin.Forms Migration API Reference

## SDK-Style Project File Template

```xml
<!-- .NET MAUI single-project csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net8.0-android;net8.0-ios;net8.0-maccatalyst</TargetFrameworks>
    <TargetFrameworks Condition="$([MSBuild]::IsOSPlatform('windows'))">
      $(TargetFrameworks);net8.0-windows10.0.19041.0
    </TargetFrameworks>
    <OutputType>Exe</OutputType>
    <UseMaui>true</UseMaui>
    <SingleProject>true</SingleProject>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

> Replace `net8.0` with `net9.0` or `net10.0` as appropriate for your target version.

---

## XAML Namespace Changes

| Xamarin.Forms | .NET MAUI |
|---------------|-----------|
| `xmlns="http://xamarin.com/schemas/2014/forms"` | `xmlns="http://schemas.microsoft.com/dotnet/2021/maui"` |
| `xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"` | *(unchanged)* |

---

## C# Namespace Changes

| Xamarin.Forms Namespace | .NET MAUI Namespace |
|------------------------|---------------------|
| `Xamarin.Forms` | `Microsoft.Maui.Controls` |
| `Xamarin.Forms.Xaml` | `Microsoft.Maui.Controls.Xaml` |
| `Xamarin.Forms.PlatformConfiguration` | `Microsoft.Maui.Controls.PlatformConfiguration` |
| `Xamarin.Forms.PlatformConfiguration.iOSSpecific` | `Microsoft.Maui.Controls.PlatformConfiguration.iOSSpecific` |
| `Xamarin.Forms.PlatformConfiguration.AndroidSpecific` | `Microsoft.Maui.Controls.PlatformConfiguration.AndroidSpecific` |
| `Xamarin.Forms.Shapes` | `Microsoft.Maui.Controls.Shapes` |
| `Xamarin.Forms.StyleSheets` | *(removed — use MAUI styles)* |

---

## Xamarin.Essentials → .NET MAUI Namespaces

In .NET MAUI, Xamarin.Essentials functionality is built in. Remove the `Xamarin.Essentials`
NuGet package and update `using` directives:

| Xamarin.Essentials | .NET MAUI Namespace |
|-------------------|---------------------|
| `Xamarin.Essentials` (general) | Split across multiple namespaces below |
| App actions, permissions, version tracking | `Microsoft.Maui.ApplicationModel` |
| Contacts, email, networking | `Microsoft.Maui.ApplicationModel.Communication` |
| Battery, sensors, flashlight, haptics | `Microsoft.Maui.Devices` |
| Media picking, text-to-speech | `Microsoft.Maui.Media` |
| Clipboard, file sharing | `Microsoft.Maui.ApplicationModel.DataTransfer` |
| File picking, secure storage, preferences | `Microsoft.Maui.Storage` |

---

## Default Spacing Value Changes

| Property | Xamarin.Forms Default | .NET MAUI Default |
|----------|----------------------|-------------------|
| `Grid.ColumnSpacing` | 6 | 0 |
| `Grid.RowSpacing` | 6 | 0 |
| `StackLayout.Spacing` | 6 | 0 |

```xml
<!-- Implicit styles to restore Xamarin.Forms defaults (add to App.xaml) -->
<Style TargetType="Grid">
    <Setter Property="ColumnSpacing" Value="6"/>
    <Setter Property="RowSpacing" Value="6"/>
</Style>
<Style TargetType="StackLayout">
    <Setter Property="Spacing" Value="6"/>
</Style>
```

---

## Layout Behavior Differences

| Issue | Xamarin.Forms | .NET MAUI | Fix |
|-------|--------------|-----------|-----|
| Grid columns/rows | Inferred from XAML | Must be explicitly declared | Add `ColumnDefinitions` and `RowDefinitions` |
| `*AndExpand` options | Supported on StackLayout | Obsolete — no effect on `HorizontalStackLayout`/`VerticalStackLayout` | Convert to `Grid` with `*` row/column sizes |
| StackLayout fill | Children could fill stacking direction | Children stack beyond available space | Use `Grid` when children need to fill space |
| `RelativeLayout` | Built-in | Compatibility namespace only | Replace with `Grid` |
| `Frame` | Built-in | Replaced by `Border` (Frame still works but measures differently) | Migrate to `Border` |
| `ScrollView` in StackLayout | Compressed to fit | Expands to full content height (no scroll) | Place `ScrollView` in `Grid` with constrained row |
| `BoxView` default size | 40×40 | 0×0 | Set explicit `WidthRequest`/`HeightRequest` |

### Converting `*AndExpand` to Grid

```xml
<!-- BEFORE (Xamarin.Forms) -->
<StackLayout>
    <Label Text="Hello world!"/>
    <Image VerticalOptions="FillAndExpand" Source="dotnetbot.png"/>
</StackLayout>

<!-- AFTER (.NET MAUI) -->
<Grid RowDefinitions="Auto, *">
    <Label Text="Hello world!"/>
    <Image Grid.Row="1" Source="dotnetbot.png"/>
</Grid>
```

---

## Renderer to Handler Migration

### Mapper Methods

| Mapper Method | When it runs |
|---------------|-------------|
| `PrependToMapping` | Before default mapper |
| `ModifyMapping` | Replaces default mapper |
| `AppendToMapping` | After default mapper |

### Customize Existing Handlers (Preferred)

```csharp
// In MauiProgram.cs
Microsoft.Maui.Handlers.EntryHandler.Mapper.AppendToMapping("NoBorder", (handler, view) =>
{
#if ANDROID
    handler.PlatformView.Background = null;
#elif IOS || MACCATALYST
    handler.PlatformView.BorderStyle = UIKit.UITextBorderStyle.None;
#endif
});
```

### Shimmed Renderers (Fallback Only)

.NET MAUI provides shims for renderers deriving from `FrameRenderer`, `ListViewRenderer`,
`ShellRenderer`, `TableViewRenderer`, and `VisualElementRenderer`:

1. Move code to `Platforms/<platform>/` folders
2. Change `Xamarin.Forms.*` namespaces to `Microsoft.Maui.*`
3. Remove `[assembly: ExportRenderer(...)]` attributes
4. Register with `ConfigureMauiHandlers` / `AddHandler`

---

## Effects Migration

```csharp
// MauiProgram.cs
builder.ConfigureEffects(effects =>
{
    effects.Add<FocusRoutingEffect, FocusPlatformEffect>();
});
```

Effects migration steps:
1. Remove `ResolutionGroupNameAttribute` and `ExportEffectAttribute`
2. Remove `Xamarin.Forms` and `Xamarin.Forms.Platform.*` using directives
3. Combine `RoutingEffect` + `PlatformEffect` implementations into a single file
   with conditional compilation
4. Register with `ConfigureEffects` in `MauiProgram.cs`

---

## NuGet Dependency Compatibility

| Compatible Frameworks | Incompatible Frameworks |
|----------------------|------------------------|
| `net8.0-android`, `monoandroid`, `monoandroidXX.X` | |
| `net8.0-ios` | `monotouch`, `xamarinios`, `xamarinios10` |
| `net8.0-macos` | `monomac`, `xamarinmac`, `xamarinmac20` |
| `net8.0-tvos` | `xamarintvos` |

---

## App Data Migration

| Data Store | Migration Guide |
|-----------|----------------|
| `Application.Properties` | Migrate to `Preferences` (`Microsoft.Maui.Storage`) |
| Secure Storage | Migrate from `Xamarin.Essentials.SecureStorage` to `Microsoft.Maui.Storage.SecureStorage` |
| Version Tracking | Migrate from `Xamarin.Essentials.VersionTracking` to `Microsoft.Maui.ApplicationModel.VersionTracking` |
| SkiaSharp | Update to SkiaSharp 2.88+ with `SkiaSharp.Views.Maui` |

---

## MauiProgram.cs Entry Point

```csharp
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            });
        return builder.Build();
    }
}
```

---

## .NET 10 Deprecated API Table

| Avoid in .NET 10 | Use Instead |
|-------------------|-------------|
| `ListView`, `TableView` | `CollectionView` |
| `Frame` | `Border` with `StrokeShape` |
| `Device.RuntimePlatform` | `DeviceInfo.Platform` |
| `Device.BeginInvokeOnMainThread()` | `MainThread.BeginInvokeOnMainThread()` |
| `Device.OpenUri()` | `Launcher.OpenAsync()` |
| `DependencyService` | Constructor injection via `builder.Services` |
| `MessagingCenter` | `WeakReferenceMessenger` (CommunityToolkit.Mvvm) |
| `DisplayAlert()` / `DisplayActionSheet()` | `DisplayAlertAsync()` / `DisplayActionSheetAsync()` |
| `FadeTo()`, `RotateTo()`, etc. | `FadeToAsync()`, `RotateToAsync()`, etc. |
| `Color.FromHex()` | `Color.FromArgb()` |
| `Page.IsBusy` | `ActivityIndicator` |
