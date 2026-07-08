# Xamarin.iOS / Xamarin.Mac / Xamarin.tvOS Migration API Reference

## SDK-Style Project File Templates

### .NET for iOS

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-ios</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>true</ImplicitUsings>
    <SupportedOSPlatformVersion>13.0</SupportedOSPlatformVersion>
  </PropertyGroup>
</Project>
```

### .NET for macOS (Mac Catalyst)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-macos</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>true</ImplicitUsings>
    <SupportedOSPlatformVersion>10.15</SupportedOSPlatformVersion>
  </PropertyGroup>
</Project>
```

### .NET for tvOS

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-tvos</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>true</ImplicitUsings>
    <SupportedOSPlatformVersion>13.0</SupportedOSPlatformVersion>
  </PropertyGroup>
</Project>
```

For library projects, omit `<OutputType>` or set to `Library`.

> Replace `net8.0` with `net9.0` or `net10.0` as appropriate. Valid TFMs:
> `net8.0-ios`, `net8.0-macos`, `net8.0-tvos`.

---

## MSBuild Property Changes

| Xamarin Property | .NET Equivalent | Action |
|-----------------|-----------------|--------|
| `MtouchArch` / `XamMacArch` | `RuntimeIdentifier` / `RuntimeIdentifiers` | Convert (see table below) |
| `HttpClientHandler` / `MtouchHttpClientHandler` | `UseNativeHttpHandler` | Convert (see table below) |
| `MtouchExtraArgs` | *(some still apply)* | Copy and test |
| `EnableCodeSigning` | *(unchanged)* | Copy |
| `CodeSigningKey` | `CodesignKey` | Rename |
| `CodesignKey` | *(unchanged)* | Copy |
| `CodesignProvision` | *(unchanged)* | Copy |
| `CodesignEntitlements` | *(unchanged)* | Copy |
| `CodesignExtraArgs` | *(unchanged)* | Copy |
| `PackageSigningKey` | *(unchanged)* | Copy |
| `PackagingExtraArgs` | *(unchanged)* | Copy |
| `ProductDefinition` | *(unchanged)* | Copy |
| `MtouchEnableSGenConc` | `EnableSGenConc` | Rename |
| `LinkDescription` | *(unchanged)* | Copy |

---

## MtouchArch → RuntimeIdentifier Conversion

### iOS

| MtouchArch Value | RuntimeIdentifier | RuntimeIdentifiers |
|-----------------|-------------------|-------------------|
| `ARMv7` | `ios-arm` | |
| `ARMv7s` | `ios-arm` | |
| `ARMv7+ARMv7s` | `ios-arm` | |
| `ARM64` | `ios-arm64` | |
| `ARMv7+ARM64` | | `ios-arm;ios-arm64` |
| `ARMv7+ARMv7s+ARM64` | | `ios-arm;ios-arm64` |
| `x86_64` | `iossimulator-x64` | |
| `i386` | `iossimulator-x86` | |
| `x86_64+i386` | | `iossimulator-x86;iossimulator-x64` |

> Use `RuntimeIdentifiers` (plural) when targeting multiple architectures.

### macOS

| Value | RuntimeIdentifier |
|-------|-------------------|
| `x86_64` | `osx-x64` |

### tvOS

| Value | RuntimeIdentifier |
|-------|-------------------|
| `ARM64` | `tvos-arm64` |
| `x86_64` | `tvossimulator-x64` |

---

## HttpClientHandler Conversion

| Xamarin Value | `UseNativeHttpHandler` |
|--------------|----------------------|
| `HttpClientHandler` | `false` |
| `NSUrlSessionHandler` | *(don't set — default)* |
| `CFNetworkHandler` | *(don't set — default)* |

---

## Info.plist Changes

Move `MinimumOSVersion` / `LSMinimumSystemVersion` from Info.plist to the project file:

```xml
<!-- BEFORE (Info.plist) -->
<key>MinimumOSVersion</key>
<string>13.0</string>

<!-- AFTER (csproj) -->
<PropertyGroup>
    <SupportedOSPlatformVersion>13.0</SupportedOSPlatformVersion>
</PropertyGroup>
```

Other Info.plist entries (display name, bundle identifier, permissions, etc.)
remain in Info.plist.

---

## NuGet Dependency Compatibility

| Compatible Frameworks | Incompatible Frameworks |
|----------------------|------------------------|
| `net8.0-ios` | `monotouch`, `xamarinios`, `xamarinios10` |
| `net8.0-macos` | `monomac`, `xamarinmac`, `xamarinmac20` |
| `net8.0-tvos` | `xamarintvos` |

> Unlike Android, there is **no backward compatibility** with old Xamarin iOS/Mac
> TFMs. Packages must be recompiled for `net8.0-ios` etc.

.NET Standard libraries without incompatible dependencies remain compatible.

---

## Xamarin.Essentials Namespace Mapping

| Xamarin.Essentials | .NET MAUI Namespace |
|-------------------|---------------------|
| App actions, permissions, version tracking | `Microsoft.Maui.ApplicationModel` |
| Contacts, email, networking | `Microsoft.Maui.ApplicationModel.Communication` |
| Battery, sensors, flashlight, haptics | `Microsoft.Maui.Devices` |
| Media picking, text-to-speech | `Microsoft.Maui.Media` |
| Clipboard, file sharing | `Microsoft.Maui.ApplicationModel.DataTransfer` |
| File picking, secure storage, preferences | `Microsoft.Maui.Storage` |

### Essentials Initialization (iOS)

```csharp
using Microsoft.Maui.ApplicationModel;

[Register("AppDelegate")]
public class AppDelegate : UIApplicationDelegate
{
    public override UIWindow? Window { get; set; }

    public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
    {
        Window = new UIWindow(UIScreen.MainScreen.Bounds);
        var vc = new UIViewController();
        Window.RootViewController = vc;

        Platform.Init(() => vc);

        Window.MakeKeyAndVisible();
        return true;
    }
}
```

### App Actions Override

```csharp
public override void PerformActionForShortcutItem(
    UIApplication application,
    UIApplicationShortcutItem shortcutItem,
    UIOperationHandler completionHandler)
{
    Platform.PerformActionForShortcutItem(application, shortcutItem, completionHandler);
}
```

---

## Supported / Unsupported Project Types

| Project Type | Status |
|-------------|--------|
| Xamarin.iOS | ✅ Supported |
| Xamarin.Mac | ✅ Supported |
| Xamarin.tvOS | ✅ Supported |
| iOS App Extensions | ✅ Supported |
| SpriteKit / SceneKit / Metal | ✅ Supported |
| Xamarin.watchOS | ❌ Not supported |
| OpenGL (iOS) | ❌ Not supported (OpenTK unavailable) |
