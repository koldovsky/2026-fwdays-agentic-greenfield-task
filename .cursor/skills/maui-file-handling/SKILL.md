---
name: maui-file-handling
description: >
  Guidance for file picker, file system helpers, bundled assets, and app data storage
  in .NET MAUI applications. Covers FilePicker APIs, FileResult handling, platform
  permissions, and common pitfalls across Android, iOS, macOS, and Windows.
  USE FOR: "file picker", "FilePicker", "pick file", "open file", "save file",
  "bundled assets", "FileSystem helpers", "AppDataDirectory", "CacheDirectory",
  "FileResult", "read file MAUI".
  DO NOT USE FOR: media capture or photo picking (use maui-media-picker),
  secure credential storage (use maui-secure-storage), or SQLite database files (use maui-sqlite-database).
---

# .NET MAUI File Handling

## Critical: Always Use `OpenReadAsync()`, Not `FullPath`

Some platforms (especially Android) return **content URIs**, not file system
paths. Reading `FullPath` directly will throw or return empty data.

```csharp
// ❌ Breaks on Android — FullPath may be a content:// URI
var result = await FilePicker.Default.PickAsync();
var bytes = File.ReadAllBytes(result.FullPath);

// ✅ Works on all platforms
var result = await FilePicker.Default.PickAsync();
if (result is not null)
{
    using var stream = await result.OpenReadAsync();
    // process stream
}
```

---

## Platform File-Type Format Gotcha

Each platform uses a **different format** for custom `FilePickerFileType`.
Mixing them up causes the picker to show no files or crash.

| Platform | Format | Example |
|---|---|---|
| Android | MIME types | `"application/json"` |
| iOS / macOS | UTType identifiers | `"public.json"` |
| Windows | Dot-prefixed extensions | `".json"` |

```csharp
// ❌ Using file extensions for Android — picker shows nothing
{ DevicePlatform.Android, new[] { ".json", ".txt" } }

// ✅ Correct MIME types for Android
{ DevicePlatform.Android, new[] { "application/json", "text/plain" } }
```

---

## Common Pitfalls

### Bundled files are read-only

`Resources/Raw` assets cannot be modified at runtime. Attempting to write
throws an exception (or silently fails on some platforms).

```csharp
// ❌ Trying to write to a bundled file
var path = "data.json"; // inside Resources/Raw
File.WriteAllText(path, newContent); // fails

// ✅ Copy to AppDataDirectory first, then modify
string targetPath = Path.Combine(FileSystem.Current.AppDataDirectory, "data.json");
if (!File.Exists(targetPath))
{
    using var source = await FileSystem.Current.OpenAppPackageFileAsync("data.json");
    using var dest = File.Create(targetPath);
    await source.CopyToAsync(dest);
}
// Now safe to read/write targetPath
```

### Bundled subdirectories are flattened

On some platforms, `Resources/Raw/subdir/file.txt` becomes just `file.txt`.
Use **unique file names** regardless of subdirectory structure.

### iOS sandbox path changes on rebuild

The iOS sandbox path includes an app GUID that changes across clean builds.
Hard-coded absolute paths break silently.

```csharp
// ❌ Hard-coded path — breaks after clean rebuild
var path = "/var/mobile/.../Documents/data.json";

// ✅ Always use the FileSystem helper
var path = Path.Combine(FileSystem.Current.AppDataDirectory, "data.json");
```

### Android: bundled stream has no `Length`

`OpenAppPackageFileAsync` may return a stream where `.Length` throws
`NotSupportedException`. Copy to a `MemoryStream` if you need the size.

```csharp
// ❌ Throws on Android
using var stream = await FileSystem.Current.OpenAppPackageFileAsync("data.json");
var size = stream.Length; // NotSupportedException

// ✅ Copy first if you need the length
using var stream = await FileSystem.Current.OpenAppPackageFileAsync("data.json");
using var ms = new MemoryStream();
await stream.CopyToAsync(ms);
var size = ms.Length;
```

### Windows: virtualized file system

Packaged apps silently redirect writes to classic paths like `%AppData%`.
Always use `AppDataDirectory` and `CacheDirectory` for reliable
cross-platform paths.

### FilePicker returns `null` on cancellation

```csharp
// ❌ NullReferenceException when user cancels
var result = await FilePicker.Default.PickAsync();
using var stream = await result.OpenReadAsync();

// ✅ Always null-check
var result = await FilePicker.Default.PickAsync();
if (result is null) return;
using var stream = await result.OpenReadAsync();
```

---

## Android Permissions (API 33+ change)

Android 13 replaced `READ_EXTERNAL_STORAGE` with granular media permissions.
Using the old permission on API 33+ silently grants nothing.

| Android version | Required permission |
|---|---|
| ≤ 12 (API 32) | `READ_EXTERNAL_STORAGE` |
| ≥ 13 (API 33) | `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO` |

---

## Checklist

- [ ] Use `OpenReadAsync()` — never read `FullPath` directly
- [ ] Null-check `FilePicker` result before accessing properties
- [ ] Custom `FilePickerFileType` uses correct format per platform (MIME / UTType / extension)
- [ ] Bundled files copied to `AppDataDirectory` before modification
- [ ] Unique file names in `Resources/Raw` (subdirectories are flattened)
- [ ] Android manifest declares correct permission for target API level
- [ ] macOS: App Sandbox entitlement includes file access
