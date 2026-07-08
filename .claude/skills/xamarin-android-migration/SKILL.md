---
name: xamarin-android-migration
description: >
  **WORKFLOW SKILL** - Guide for migrating Xamarin.Android native apps to .NET for Android. Covers
  SDK-style project conversion, target framework monikers, MSBuild property changes,
  AndroidManifest.xml updates, NuGet dependency compatibility, Android binding library
  migration, Xamarin.Essentials in native apps, .NET CLI support, and platform-specific
  gotchas.
  USE FOR: "migrate Xamarin.Android", "upgrade Xamarin.Android to .NET",
  "Xamarin.Android to .NET for Android", "Android project migration",
  "Android binding library migration", "convert Android project to SDK-style",
  "AndroidSupportedAbis to RuntimeIdentifiers".
  DO NOT USE FOR: migrating Xamarin.Forms apps (use xamarin-forms-migration),
  migrating Xamarin.iOS apps (use xamarin-ios-migration),
  creating new MAUI apps from scratch (use feature-specific MAUI skills).
---

# Xamarin.Android → .NET for Android Migration

For SDK-style project templates, MSBuild property tables, ABI conversion, namespace mappings, and CLI commands, see `references/android-migration-api.md`.

> ⚠️ **Field-tested advice:** Android migration is significantly harder than iOS.
> Expect more UI bugs, OEM-specific rendering differences, and issues not
> reproducible on emulators. **Test on physical devices.**

## Migration Workflow

1. Create new .NET for Android project (`dotnet new android`)
2. Copy code and resources into the new project
3. Update MSBuild properties (see `references/android-migration-api.md`)
4. Update AndroidManifest.xml — remove `<uses-sdk>`, use csproj properties
5. Delete `Resource.designer.cs` (regenerated automatically)
6. Update NuGet dependencies
7. Migrate binding libraries (if applicable)
8. Replace Xamarin.Essentials with `<UseMauiEssentials>true</UseMauiEssentials>`
9. Handle encoding changes
10. Delete `bin/`/`obj/`, build, test on physical devices

> **Strategy:** Create a new project and copy code into it — don't edit the existing project file in place.

## Critical Gotchas

### ⚠️ Remove `<uses-sdk>` from AndroidManifest.xml

```xml
<!-- ❌ Xamarin-style — causes build warnings/errors -->
<uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

<!-- ✅ Use MSBuild properties instead -->
<TargetFramework>net8.0-android</TargetFramework>
<SupportedOSPlatformVersion>21</SupportedOSPlatformVersion>
```

### ⚠️ Delete `Resource.designer.cs`

This file is auto-generated. Leftover copies from Xamarin cause duplicate symbol errors. **Delete it** — it will be regenerated.

### ⚠️ No `.dll.config` or `.exe.config` Support

`.dll.config` and `<dllmap>` are not supported in .NET Core. If your app uses `System.Configuration.ConfigurationManager`, migrate to `appsettings.json` or platform preferences.

### ⚠️ Essentials: Override Permissions in Every Activity

```csharp
// ❌ Forgetting this → permissions silently fail
// ✅ Required in EVERY Activity that uses Essentials
public override void OnRequestPermissionsResult(
    int requestCode, string[] permissions, Permission[] grantResults)
{
    Platform.OnRequestPermissionsResult(requestCode, permissions, grantResults);
    base.OnRequestPermissionsResult(requestCode, permissions, grantResults);
}
```

### ⚠️ AndroidManifest.xml Location Changed

`AndroidManifest.xml` is now in the **project root** (not `Properties/`). The SDK-style project finds it there by default.

## Platform-Specific Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| OEM rendering differences | UI bugs not visible on emulators | Test on physical devices from multiple vendors |
| Shadow rendering varies by OEM/API level | Inconsistent shadow appearance | Implement shadows in platform-specific handler code |
| Android Wear references | Not supported in .NET for Android | Remove Wear project references |
| `MAndroidI18n` removed | Encoding errors at runtime | Replace with `System.Text.Encoding.CodePages` NuGet |
| `AotAssemblies` deprecated | Build warnings | Use `RunAOTCompilation` instead |
| `jar2xml` not supported | Binding library build failures | Use default `class-parse` parser |
| `DebugType=full` not supported | Build errors | Use default `portable` |

## NuGet Compatibility Note

Android is unique: packages targeting `monoandroid` **still work** on .NET for Android. No recompilation needed for most Android-specific packages. This is NOT true for iOS/Mac.

If no compatible version exists:
1. Recompile with .NET TFMs (if you own it)
2. Look for a preview .NET version
3. Replace with a .NET-compatible alternative

## API Currency Warning

If your migrated app will also adopt .NET MAUI controls (e.g., via `UseMaui`), check the **maui-current-apis** skill for deprecated MAUI APIs to avoid (ListView, Frame, Device.*, etc.).

## Quick Checklist

1. ☐ Created new .NET for Android project (`dotnet new android`)
2. ☐ Set `TargetFramework` to `net8.0-android` (or later)
3. ☐ Set `SupportedOSPlatformVersion` for minimum SDK
4. ☐ Converted `AndroidSupportedAbis` → `RuntimeIdentifiers`
5. ☐ Removed `<uses-sdk>` from AndroidManifest.xml
6. ☐ Copied source, resources, and project properties
7. ☐ Deleted `Resource.designer.cs`, `bin/`, `obj/`
8. ☐ Updated NuGet dependencies
9. ☐ Added `UseMauiEssentials` + `Platform.Init()` if using Essentials
10. ☐ Overridden `OnRequestPermissionsResult` in every Activity
11. ☐ Replaced `MAndroidI18n` with `System.Text.Encoding.CodePages`
12. ☐ Verified AOT settings (`RunAOTCompilation`, not `AotAssemblies`)
13. ☐ Tested on physical Android device(s) from multiple vendors
