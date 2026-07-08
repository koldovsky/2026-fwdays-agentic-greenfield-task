---
name: maui-localization
description: >-
  Guidance for localizing .NET MAUI apps: multi-language support via .resx resource files,
  culture resolution and runtime switching, RTL layout, platform language declarations
  (iOS/Mac Catalyst Info.plist, Windows Package.appxmanifest), and image localization strategies.
  USE FOR: "localization", "multi-language", "resx resource", "translate app", "RTL layout",
  "culture switching", "localize strings", "right-to-left", "language support MAUI",
  "Info.plist languages".
  DO NOT USE FOR: theming or visual styles (use maui-theming), accessibility labels
  (use maui-accessibility), or content from REST APIs (use maui-rest-api).
---

# .NET MAUI Localization

## Common gotchas

| Issue | Fix |
|---|---|
| `ResourceManager` returns `null` for default culture | Set `<NeutralLanguage>en-US</NeutralLanguage>` in `.csproj` |
| iOS ignores culture overrides | `CFBundleLocalizations` missing from `Info.plist` |
| Windows doesn't show correct language | `<Resource Language="..." />` missing from `Package.appxmanifest` |
| `x:Static` bindings don't update on language switch | `x:Static` is one-time — use binding approach with `INotifyPropertyChanged` |
| `.Designer.cs` not regenerating in VS Code | Add `<CoreCompileDependsOn>PrepareResources;$(CoreCompileDependsOn)</CoreCompileDependsOn>` and run `dotnet build` |

## ⚠️ NeutralLanguage is mandatory

```xml
<!-- ✅ Always set in .csproj -->
<PropertyGroup>
  <NeutralLanguage>en-US</NeutralLanguage>
</PropertyGroup>

<!-- ❌ Missing this causes ResourceManager to return null at runtime -->
```

## Platform declarations — don't forget these

### iOS / Mac Catalyst

⚠️ Without this, iOS won't offer your app's languages in system Settings:

```xml
<!-- Platforms/iOS/Info.plist AND Platforms/MacCatalyst/Info.plist -->
<key>CFBundleLocalizations</key>
<array>
  <string>en</string>
  <string>es</string>
  <string>fr</string>
</array>
```

### Windows

```xml
<!-- Platforms/Windows/Package.appxmanifest -->
<Resources>
  <Resource Language="en-US" />
  <Resource Language="es" />
  <Resource Language="fr-FR" />
</Resources>
```

### Android

Android picks up `.resx`-based localization automatically. No additional manifest entries required. ✅

## Runtime language switching — x:Static trap

```xml
<!-- ❌ Won't update when language changes at runtime -->
<Label Text="{x:Static resx:AppResources.WelcomeMessage}" />

<!-- ✅ Updates dynamically via INotifyPropertyChanged -->
<Label Text="{Binding [WelcomeMessage], Source={x:Static local:LocalizationResourceManager.Instance}}" />
```

When switching culture, set **all three** properties or formatting is inconsistent:

```csharp
// ✅ Complete culture switch
var culture = new CultureInfo("es");
CultureInfo.CurrentUICulture = culture;  // resource lookup
CultureInfo.CurrentCulture = culture;     // dates/numbers
AppResources.Culture = culture;           // ResourceManager

// ❌ Only sets UI culture — dates/numbers stay in old culture
CultureInfo.CurrentUICulture = new CultureInfo("es");
```

## RTL layout — set FlowDirection at page level

```xml
<!-- ✅ Page-level — children inherit -->
<ContentPage FlowDirection="RightToLeft">
  <StackLayout FlowDirection="MatchParent" />
</ContentPage>

<!-- ❌ Only on child — parent still LTR, layout breaks -->
<ContentPage>
  <StackLayout FlowDirection="RightToLeft" />
</ContentPage>
```

## VS Code pitfall

⚠️ `.Designer.cs` may not regenerate on save. Add to `.csproj` and run `dotnet build` after `.resx` changes:

```xml
<CoreCompileDependsOn>PrepareResources;$(CoreCompileDependsOn)</CoreCompileDependsOn>
```

## Decision framework

| Need | Approach |
|---|---|
| Static multilingual strings | `.resx` files with `x:Static` bindings |
| Runtime language switching | `LocalizationResourceManager` with `INotifyPropertyChanged` bindings |
| Culture-specific images | Name images `banner_{culture}.png` or store paths in `.resx` |
| RTL support | Set `FlowDirection` at page level, detect with `TextInfo.IsRightToLeft` |
| Date/number formatting | Set `CultureInfo.CurrentCulture` alongside `CurrentUICulture` |

## Quick checklist

- [ ] `NeutralLanguage` set in `.csproj`
- [ ] Default `AppResources.resx` contains all keys
- [ ] Each target language has its own `AppResources.{culture}.resx`
- [ ] iOS/Mac: `CFBundleLocalizations` lists all supported languages
- [ ] Windows: `Package.appxmanifest` declares `<Resource Language="..." />`
- [ ] RTL cultures set `FlowDirection` at page/app level
- [ ] Runtime switching sets all three: `CurrentUICulture`, `CurrentCulture`, `AppResources.Culture`
- [ ] `dotnet build` regenerates `.Designer.cs` after `.resx` changes
