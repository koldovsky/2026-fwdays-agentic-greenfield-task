# Hot Reload Setup & Configuration Reference

## Environment Variables for Diagnostics

### Enable detailed logging

```bash
# Mac/Linux - Edit and Continue logs
export Microsoft_CodeAnalysis_EditAndContinue_LogDir=/tmp/HotReloadLog

# Windows
set Microsoft_CodeAnalysis_EditAndContinue_LogDir=%temp%\HotReloadLog

# XAML Hot Reload logging
export HOTRELOAD_XAML_LOG_MESSAGES=1

# Xamarin-style debug logging (legacy, may help)
export XAMARIN_HOT_RELOAD_SHOW_DEBUG_LOGGING=1
```

### Check if variables are set

```bash
# Mac/Linux
env | grep -i hotreload
env | grep -i EditAndContinue

# Windows PowerShell
Get-ChildItem Env: | Where-Object { $_.Name -match "hotreload|EditAndContinue" }
```

## VS Code Settings

Enable in VS Code settings (search "Hot Reload"):

```json
{
  "csharp.experimental.debug.hotReload": true,
  "csharp.debug.hotReloadOnSave": true,
  "csharp.debug.hotReloadVerbosity": "detailed"
}
```

## Visual Studio Settings

1. Tools > Options > Debugging > .NET/C++ Hot Reload
2. Enable: **Enable Hot Reload**, **Apply on file save**
3. Set **Logging verbosity** to **Detailed** or **Diagnostic**

## MetadataUpdateHandler

For custom hot reload handling (e.g., MauiReactor), implement `MetadataUpdateHandler`:

```csharp
[assembly: System.Reflection.Metadata.MetadataUpdateHandler(typeof(HotReloadService))]

internal static class HotReloadService
{
    public static void ClearCache(Type[]? updatedTypes) { }

    public static void UpdateApplication(Type[]? updatedTypes)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            // Refresh your UI framework
        });
    }
}
```

### Verify MetadataUpdateHandler is registered

```bash
grep -rn "MetadataUpdateHandler" --include="*.cs"
grep -rn "assembly:.*MetadataUpdateHandler" --include="*.cs"
```

## MauiReactor-Specific Hot Reload Setup

MauiReactor v3+ uses .NET's feature switch pattern for hot reload (no code call needed).

Add to your `.csproj` file:
```xml
<ItemGroup Condition="'$(Configuration)'=='Debug'">
  <RuntimeHostConfigurationOption Include="MauiReactor.HotReload" Value="true" Trim="false" />
</ItemGroup>

<!-- For Release builds (AOT compatibility) -->
<ItemGroup Condition="'$(Configuration)'=='Release'">
  <RuntimeHostConfigurationOption Include="MauiReactor.HotReload" Value="false" Trim="true" />
</ItemGroup>
```

### Check MauiReactor hot reload setup

```bash
grep -A2 "MauiReactor.HotReload" *.csproj
grep -rn "EnableMauiReactorHotReload" --include="*.cs" && echo "WARNING: Remove this call for v3+"
```

### MauiReactor hot reload requirements

1. `RuntimeHostConfigurationOption` set in `.csproj` (not a code call)
2. Debug configuration
3. Debugger attached (F5)
4. Works on all platforms (iOS, Android, Mac Catalyst, Windows)
5. Works in VS Code and Visual Studio

## C# Markup (CommunityToolkit.Maui.Markup) Hot Reload Setup

1. Add the NuGet package: `CommunityToolkit.Maui.Markup`

2. Enable in MauiProgram.cs:
```csharp
var builder = MauiApp.CreateBuilder();
builder
    .UseMauiApp<App>()
    .UseMauiCommunityToolkitMarkup(); // Enables hot reload support
```

3. Implement the handler interface on pages/views that need refresh:
```csharp
public partial class MainPage : ContentPage, ICommunityToolkitHotReloadHandler
{
    public MainPage()
    {
        Build();
    }

    void Build() => Content = new VerticalStackLayout
    {
        Children =
        {
            new Label().Text("Hello, World!"),
            new Button().Text("Click Me")
        }
    };

    void ICommunityToolkitHotReloadHandler.OnHotReload() => Build();
}
```

### Check C# Markup hot reload setup

```bash
grep -i "CommunityToolkit.Maui.Markup" *.csproj
grep -n "UseMauiCommunityToolkitMarkup" MauiProgram.cs
grep -rn "ICommunityToolkitHotReloadHandler" --include="*.cs"
```

## Blazor Hybrid Hot Reload

### How Blazor Hybrid hot reload works

- **Razor components (`.razor`)**: Changes to markup and C# code blocks reload automatically
- **CSS files (`.css`)**: Style changes apply immediately
- **C# code-behind (`.razor.cs`)**: Uses standard C# Hot Reload rules
- **Shared C# code**: Standard C# Hot Reload applies

### Setup requirements

1. Debug configuration (not Release)
2. Debugger attached (F5, not Ctrl+F5)
3. For Visual Studio: Ensure "Hot Reload on File Save" is enabled

### Check Blazor Hybrid setup

```bash
grep -rn "BlazorWebView" --include="*.xaml" --include="*.cs"
find . -name "_Imports.razor"
ls -la */wwwroot/ 2>/dev/null || ls -la wwwroot/ 2>/dev/null
```

### Environment variable for Blazor debugging

```bash
export ASPNETCORE_ENVIRONMENT=Development
```

## Diagnostic Commands

### Collect full diagnostic bundle

```bash
# 1. Environment info
dotnet --info > dotnet-info.txt
dotnet workload list > workloads.txt

# 2. Build with binary log
dotnet build -bl:build.binlog -c Debug

# 3. Check for encoding issues
find . -name "*.cs" -path "*/src/*" | head -20 | xargs file

# 4. Check hot reload env vars
env | grep -iE "(hotreload|editandcontinue|xamarin.*debug)" || echo "No hot reload env vars set"
```

### Enable all diagnostic logging then reproduce

```bash
export Microsoft_CodeAnalysis_EditAndContinue_LogDir=/tmp/HotReloadLog
export HOTRELOAD_XAML_LOG_MESSAGES=1
# Launch IDE from this terminal, reproduce issue, then check /tmp/HotReloadLog/
```

## References

- [Diagnosing Hot Reload (MAUI Wiki)](https://github.com/dotnet/maui/wiki/Diagnosing-Hot-Reload)
- [.NET Hot Reload in Visual Studio](https://learn.microsoft.com/visualstudio/debugger/hot-reload)
- [Supported code changes (C#)](https://learn.microsoft.com/visualstudio/debugger/supported-code-changes-csharp)
- [XAML Hot Reload for .NET MAUI](https://learn.microsoft.com/dotnet/maui/xaml/hot-reload)
- [CommunityToolkit.Maui.Markup Hot Reload](https://learn.microsoft.com/dotnet/communitytoolkit/maui/markup/dotnet-hot-reload)
- [Blazor Hybrid with .NET MAUI](https://learn.microsoft.com/aspnet/core/blazor/hybrid/tutorials/maui)
