# Xamarin.Android Migration API Reference

## SDK-Style Project File Template

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-android</TargetFramework>
    <SupportedOSPlatformVersion>21</SupportedOSPlatformVersion>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <ApplicationId>com.companyname.myapp</ApplicationId>
    <ApplicationVersion>1</ApplicationVersion>
    <ApplicationDisplayVersion>1.0</ApplicationDisplayVersion>
  </PropertyGroup>
</Project>
```

For library projects, omit `<OutputType>` or set it to `Library`.

> Replace `net8.0-android` with `net9.0-android` or `net10.0-android` as needed.

---

## MSBuild Property Changes

| Xamarin.Android Property | .NET for Android Equivalent | Notes |
|-------------------------|---------------------------|-------|
| `AndroidSupportedAbis` | `RuntimeIdentifiers` | See conversion table below |
| `AotAssemblies` | `RunAOTCompilation` | Deprecated in .NET 7 |
| `AndroidClassParser` | *(default: `class-parse`)* | `jar2xml` not supported |
| `AndroidDexTool` | *(default: `d8`)* | `dx` not supported |
| `AndroidCodegenTarget` | *(default: `XAJavaInterop1`)* | `XamarinAndroid` not supported |
| `AndroidManifest` | *(default: `AndroidManifest.xml` in root)* | No longer in `Properties/` |
| `DebugType` | *(default: `portable`)* | `full` and `pdbonly` not supported |
| `MonoSymbolArchive` | *(removed)* | `mono-symbolicate` not supported |
| `MAndroidI18n` | `System.Text.Encoding.CodePages` NuGet | See encoding section |
| `AndroidUseIntermediateDesignerFile` | *(default: `True`)* | |
| `AndroidBoundExceptionType` | *(default: `System`)* | Aligns with .NET semantics |

### ABI → RuntimeIdentifier Conversion

| `AndroidSupportedAbis` | `RuntimeIdentifiers` |
|------------------------|---------------------|
| `armeabi-v7a` | `android-arm` |
| `arm64-v8a` | `android-arm64` |
| `x86` | `android-x86` |
| `x86_64` | `android-x64` |

```xml
<!-- Xamarin.Android -->
<AndroidSupportedAbis>armeabi-v7a;arm64-v8a;x86;x86_64</AndroidSupportedAbis>

<!-- .NET for Android -->
<RuntimeIdentifiers>android-arm;android-arm64;android-x86;android-x64</RuntimeIdentifiers>
```

---

## AndroidManifest.xml Changes

Remove `<uses-sdk>` from AndroidManifest.xml. Use MSBuild properties instead:

```xml
<!-- BEFORE (Xamarin.Android AndroidManifest.xml) -->
<uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

<!-- AFTER (.NET for Android csproj) -->
<PropertyGroup>
    <TargetFramework>net8.0-android</TargetFramework>  <!-- targetSdkVersion -->
    <SupportedOSPlatformVersion>21</SupportedOSPlatformVersion>  <!-- minSdkVersion -->
</PropertyGroup>
```

---

## NuGet Dependency Compatibility

| Compatible Frameworks | Incompatible |
|----------------------|-------------|
| `net8.0-android` | |
| `monoandroid` | |
| `monoandroidXX.X` | |

> Android is unique: NuGet packages targeting `monoandroid` still work on .NET for Android.
> .NET Standard libraries without incompatible dependencies are also compatible.

---

## Binding Library Migration

For binding libraries, create a new project and copy bindings:

```shell
dotnet new android-bindinglib --output MyJavaBinding
```

Key changes:
- Use SDK-style project format
- `@(InputJar)`, `@(EmbeddedJar)`, or `@(LibraryProjectZip)` auto-enable
  `$(AllowUnsafeBlocks)`
- `AndroidClassParser` defaults to `class-parse` (no `jar2xml`)

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

### Essentials Initialization

```csharp
using Microsoft.Maui.ApplicationModel;

[Activity(Label = "@string/app_name", MainLauncher = true)]
public class MainActivity : Activity
{
    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        Platform.Init(this, savedInstanceState);
    }
}
```

Override `OnRequestPermissionsResult` in every Activity:

```csharp
public override void OnRequestPermissionsResult(int requestCode, string[] permissions, Permission[] grantResults)
{
    Platform.OnRequestPermissionsResult(requestCode, permissions, grantResults);
    base.OnRequestPermissionsResult(requestCode, permissions, grantResults);
}
```

---

## Encoding Changes

Replace `MAndroidI18n` with the `System.Text.Encoding.CodePages` NuGet package:

```csharp
// At app startup
System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
```

---

## AOT Compilation

Release builds default to profiled AOT:

```xml
<PropertyGroup Condition="'$(Configuration)' == 'Release'">
    <RunAOTCompilation>true</RunAOTCompilation>
    <AndroidEnableProfiledAot>true</AndroidEnableProfiledAot>
</PropertyGroup>
```

To disable AOT, explicitly set both to `false`.

---

## .NET CLI Commands

| Command | Description |
|---------|-------------|
| `dotnet new android` | Create new app |
| `dotnet new androidlib` | Create class library |
| `dotnet new android-bindinglib` | Create binding library |
| `dotnet new android-activity --name LoginActivity` | Add activity |
| `dotnet new android-layout --name MyLayout --output Resources/layout` | Add layout |
| `dotnet build` | Build (produces `.apk`/`.aab`) |
| `dotnet run --project MyApp.csproj` | Deploy and run on device/emulator |
| `dotnet publish` | Publish for distribution |

> **Note:** `dotnet build` produces a runnable `.apk`/`.aab` directly (unlike desktop
> .NET where `publish` is typically needed). Inside IDEs, the `Install` target handles
> deployment instead.
