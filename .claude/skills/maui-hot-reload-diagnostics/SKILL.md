---
name: maui-hot-reload-diagnostics
description: >
  Diagnose and troubleshoot .NET MAUI Hot Reload issues (C# Hot Reload, XAML Hot Reload,
  Blazor Hybrid). Covers all UI approaches (XAML, MauiReactor, C# Markup, Blazor Hybrid),
  Visual Studio, VS Code, environment variables, encoding requirements, and MetadataUpdateHandler.
  USE FOR: "hot reload not working", "XAML hot reload", "C# hot reload", "UI not updating",
  "hot reload troubleshooting", "MetadataUpdateHandler", "hot reload Blazor Hybrid",
  "hot reload VS Code", "DOTNET_WATCH".
  DO NOT USE FOR: general build errors (not hot reload related), app lifecycle events
  (use maui-app-lifecycle), or performance profiling (use maui-performance).
---

# .NET MAUI Hot Reload Diagnostics

Systematically diagnose Hot Reload failures for .NET MAUI apps.

## Quick diagnosis checklist

1. **Identify what's failing**: XAML Hot Reload (`.xaml` changes) vs C# Hot Reload (`.cs` changes)
2. **Check run configuration**: Must be **Debug** config, started with F5/debugger attached
3. **Save file and re-execute code path**: C# changes require re-triggering the code
4. **Check Hot Reload output**: View > Output > "Hot Reload" (VS) or "C# Hot Reload" (VS Code)

## ⚠️ File encoding requirement

**CRITICAL: All `.cs` files must be UTF-8 with BOM encoding.**

```bash
# Check if file has BOM (should show "UTF-8 Unicode (with BOM)")
file -I *.cs

# Find files without BOM
find . -name "*.cs" -exec sh -c 'head -c 3 "$1" | od -An -tx1 | grep -q "ef bb bf" || echo "$1"' _ {} \;

# Fix: convert to UTF-8 with BOM
sed -i '1s/^\(\xef\xbb\xbf\)\?/\xef\xbb\xbf/' file.cs
# Or in VS Code: Open file > Save with Encoding > UTF-8 with BOM
```

## Common issues and fixes

### "Nothing happens when I save"

1. Verify Debug configuration (not Release)
2. Check Hot Reload output for errors
3. Ensure file is saved (not just modified)
4. Re-execute the code path (navigate again, tap button again)

### "Unsupported edit" / "Rude edit"

Some changes **always** require app restart:
- Adding/removing methods, fields, properties
- Changing method signatures
- Modifying static constructors
- Changes to generics

### XAML changes don't apply (iOS)

- ⚠️ Set Linker to **Don't Link** in iOS build settings
- Config must be named exactly **Debug**
- Don't use `XamlCompilationOptions.Skip`

### Changes apply but UI doesn't update

- For C#: Must re-trigger the code (re-navigate, re-tap)
- Check for cached binding values or state
- Verify you're editing the correct target framework file

## Framework-specific pitfalls

### MauiReactor v3+

```xml
<!-- ✅ Correct — feature switch in .csproj -->
<ItemGroup Condition="'$(Configuration)'=='Debug'">
  <RuntimeHostConfigurationOption Include="MauiReactor.HotReload" Value="true" Trim="false" />
</ItemGroup>
```

```csharp
// ❌ Wrong — v2 API, remove for v3+
.EnableMauiReactorHotReload()
```

⚠️ If migrating from MauiReactor v2, **remove** the `EnableMauiReactorHotReload()` call from `MauiProgram.cs`.

### C# Markup (CommunityToolkit.Maui.Markup)

Key points — missing any of these breaks hot reload:

- ⚠️ Extract UI building into a separate `Build()` method
- ⚠️ Implement `ICommunityToolkitHotReloadHandler` on any page/view needing refresh
- The `OnHotReload()` method is called automatically after C# hot reload
- Must call `.UseMauiCommunityToolkitMarkup()` in `MauiProgram.cs`

### Blazor Hybrid limitations

These changes **always** require restart:
- Adding new components
- Modifying `@inject` services
- Static asset changes (images, fonts)
- Changes to `Program.cs` or `MauiProgram.cs`

These usually work without restart:
- Razor markup and C# code block changes
- CSS changes (may need hard refresh if cached)
- Changing component parameters

⚠️ **CSS isolation**: If `.razor.css` changes don't apply, verify the isolated CSS file is properly linked.

## Decision framework — which hot reload type?

| UI approach | What reloads | Watch out for |
|---|---|---|
| XAML | `.xaml` files (instant) | Linker must be off on iOS; config must be "Debug" |
| C# code-behind | Method bodies only | Must re-trigger code path; rude edits require restart |
| MauiReactor v3+ | Component re-render | Need `RuntimeHostConfigurationOption`, not code call |
| C# Markup | `Build()` method body | Must implement `ICommunityToolkitHotReloadHandler` |
| Blazor Hybrid | `.razor` + `.css` | New components/services need restart |

## Debugging tips

- ⚠️ **Always check the Hot Reload output window first** — it tells you exactly why a change was rejected.
- Enable detailed logging with env vars before launching IDE (see `references/hot-reload-setup.md`).
- Binary logs (`dotnet build -bl:build.binlog`) help diagnose build-related hot reload failures.
- When reporting bugs, include: `dotnet --info`, workload list, binary log, and Hot Reload output.

## Quick checklist

- [ ] Debug configuration selected (not Release)
- [ ] Debugger attached (F5, not Ctrl+F5)
- [ ] All `.cs` files are UTF-8 with BOM
- [ ] Hot Reload output window checked for errors
- [ ] Code path re-triggered after C# changes
- [ ] MauiReactor: `RuntimeHostConfigurationOption` in `.csproj` (not code call)
- [ ] C# Markup: `ICommunityToolkitHotReloadHandler` implemented
- [ ] Blazor Hybrid: not changing services/startup code
