---
name: xamarin-ios-migration
description: >
  **WORKFLOW SKILL** - Guide for migrating Xamarin.iOS, Xamarin.Mac, and Xamarin.tvOS native apps to
  .NET for iOS, .NET for macOS, and .NET for tvOS. Covers SDK-style project
  conversion, target framework monikers, MSBuild property changes, Info.plist
  updates, iOS binding library migration, Xamarin.Essentials in native apps,
  NuGet dependency compatibility, and code signing changes.
  USE FOR: "migrate Xamarin.iOS", "upgrade Xamarin.iOS to .NET",
  "Xamarin.iOS to .NET for iOS", "iOS project migration", "Xamarin.Mac migration",
  "tvOS migration", "iOS binding library migration", "MtouchArch to RuntimeIdentifier",
  "Apple project migration".
  DO NOT USE FOR: migrating Xamarin.Forms apps (use xamarin-forms-migration),
  migrating Xamarin.Android apps (use xamarin-android-migration),
  creating new MAUI apps from scratch (use feature-specific MAUI skills).
---

# Xamarin.iOS / Xamarin.Mac / Xamarin.tvOS → .NET Migration

For SDK-style project templates, MSBuild property tables, RuntimeIdentifier conversion tables, and namespace mappings, see `references/ios-migration-api.md`.

## Migration Workflow

1. Create new .NET for iOS/macOS/tvOS project (same name, copy code into it)
2. Update MSBuild properties (see `references/ios-migration-api.md`)
3. Move `MinimumOSVersion` from Info.plist → `SupportedOSPlatformVersion` in csproj
4. Copy code, resources, storyboards, entitlements
5. Update NuGet dependencies
6. Migrate binding libraries (if applicable)
7. Replace Xamarin.Essentials with `<UseMauiEssentials>true</UseMauiEssentials>`
8. Remove `.dll.config` files (not supported in .NET)
9. Delete `bin/`/`obj/`, build, verify code signing, test on device

> **Strategy:** Create a new project and copy code into it — don't edit the existing project file.

## Critical Gotchas

### ⚠️ No Backward Compatibility for iOS/Mac NuGet Packages

Unlike Android, there is **no backward compatibility** with old Xamarin iOS/Mac TFMs. Packages targeting `monotouch`, `xamarinios`, `xamarinios10`, `monomac`, or `xamarinmac` **will not work** — they must be recompiled for `net8.0-ios` etc.

### ⚠️ `CodeSigningKey` → `CodesignKey` Rename

```xml
<!-- ❌ Old property name — silently ignored -->
<CodeSigningKey>Apple Distribution: My Company</CodeSigningKey>

<!-- ✅ Renamed property -->
<CodesignKey>Apple Distribution: My Company</CodesignKey>
```

Also rename `MtouchEnableSGenConc` → `EnableSGenConc`.

### ⚠️ No `.dll.config` or `.exe.config` Support

`.dll.config` and `<dllmap>` are not supported in .NET Core. Migrate configuration to `appsettings.json`, embedded resources, or platform preferences.

### ⚠️ watchOS Is Not Supported

Xamarin.watchOS has **no .NET equivalent**. Bundle Swift extensions with .NET for iOS apps instead.

### ⚠️ OpenGL (iOS) Is Not Supported

OpenTK is unavailable in .NET for iOS. Migrate to Metal or SceneKit.

### ⚠️ Linker Behavior Is Stricter

Update `LinkDescription` XML files if custom linker configuration was used. The linker in .NET is stricter and may trim symbols that the Xamarin linker preserved.

## Platform-Specific Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|------------|
| iOS/Mac NuGet packages not backward-compatible | Build failures for packages targeting `xamarinios` | Recompile or find .NET-compatible alternatives |
| `CodeSigningKey` silently ignored | App fails to sign but no clear error | Rename to `CodesignKey` |
| `MtouchArch` not converted | Wrong architecture targeted | Convert to `RuntimeIdentifier(s)` — see reference tables |
| `MinimumOSVersion` left in Info.plist | Ignored — uses csproj value | Move to `SupportedOSPlatformVersion` |
| Entitlements path wrong | Build succeeds but runtime failures | Verify `CodesignEntitlements` points to correct file |
| `.dll.config` files present | Silently ignored at runtime | Remove and migrate to alternatives |

## Binding Library Migration Tips

- Use SDK-style project format with `net8.0-ios` TFM
- The binding generator and API definitions work the same way
- Verify native frameworks are updated for the target iOS version
- **Test thoroughly** — binding edge cases are common in .NET migrations

## NuGet Compatibility Decision

| Situation | Action |
|-----------|--------|
| You own the package | Recompile with .NET TFMs |
| Package has preview .NET version | Use preview |
| No compatible version | Replace with .NET-compatible alternative |
| .NET Standard library (no platform deps) | ✅ Still works |

## Build Troubleshooting

| Issue | Fix |
|-------|-----|
| Namespace not found | Most UIKit namespaces are unchanged — verify against .NET for iOS API surface |
| Linker errors | Update `LinkDescription` XML files — linker is stricter in .NET |
| Code signing failure | Verify `CodesignKey`, `CodesignProvision`, `CodesignEntitlements` |
| Entitlements mismatch | Ensure entitlements file matches provisioning profile |

## API Currency Warning

If your migrated app will also adopt .NET MAUI controls (e.g., via `UseMaui`), check the **maui-current-apis** skill for deprecated MAUI APIs to avoid (ListView, Frame, Device.*, etc.).

## Quick Checklist

1. ☐ Created new .NET for iOS/macOS/tvOS project
2. ☐ Set `TargetFramework` to `net8.0-ios` (or `-macos`/`-tvos`)
3. ☐ Moved `MinimumOSVersion` → `SupportedOSPlatformVersion` in csproj
4. ☐ Converted `MtouchArch` → `RuntimeIdentifier(s)`
5. ☐ Converted `HttpClientHandler` → `UseNativeHttpHandler`
6. ☐ Renamed `CodeSigningKey` → `CodesignKey`
7. ☐ Renamed `MtouchEnableSGenConc` → `EnableSGenConc`
8. ☐ Copied source, resources, storyboards, entitlements
9. ☐ Updated NuGet dependencies (no backward compat with Xamarin TFMs!)
10. ☐ Added `UseMauiEssentials` + `Platform.Init()` if using Essentials
11. ☐ Removed `.dll.config` files
12. ☐ Deleted `bin/` and `obj/` folders
13. ☐ Verified code signing and provisioning
14. ☐ Tested on physical device
