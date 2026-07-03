# File Handling API Reference

## FilePicker API

Use `FilePicker.Default` to let users select files from the device.

### Single file

```csharp
var result = await FilePicker.Default.PickAsync(new PickOptions
{
    PickerTitle = "Select a file",
    FileTypes = FilePickerFileType.Images
});

if (result is not null)
{
    using var stream = await result.OpenReadAsync();
    // process stream
}
```

### Multiple files

```csharp
var results = await FilePicker.Default.PickMultipleAsync(new PickOptions
{
    PickerTitle = "Select files",
    FileTypes = FilePickerFileType.Videos
});

foreach (var file in results)
{
    // file.FileName, file.FullPath, file.ContentType
}
```

### PickOptions

| Property    | Type                 | Purpose                              |
|-------------|----------------------|--------------------------------------|
| `PickerTitle` | `string`           | Title shown on the picker dialog     |
| `FileTypes`   | `FilePickerFileType` | Restricts selectable file types    |

## FilePickerFileType

### Built-in types

- `FilePickerFileType.Images` — common image formats
- `FilePickerFileType.Png` — PNG only
- `FilePickerFileType.Jpeg` — JPEG only
- `FilePickerFileType.Videos` — common video formats
- `FilePickerFileType.Pdf` — PDF files

### Custom per-platform type

```csharp
var customFileType = new FilePickerFileType(
    new Dictionary<DevicePlatform, IEnumerable<string>>
    {
        { DevicePlatform.Android, new[] { "application/json", "text/plain" } },   // MIME types
        { DevicePlatform.iOS, new[] { "public.json", "public.plain-text" } },     // UTTypes
        { DevicePlatform.macOS, new[] { "public.json", "public.plain-text" } },   // UTTypes
        { DevicePlatform.WinUI, new[] { ".json", ".txt" } }                       // file extensions
    });
```

## FileResult

Returned by `PickAsync` and `PickMultipleAsync`.

| Property        | Type     | Notes                                      |
|-----------------|----------|--------------------------------------------|
| `FullPath`      | `string` | Platform-specific absolute path            |
| `FileName`      | `string` | File name with extension                   |
| `ContentType`   | `string` | MIME type of the file                      |
| `OpenReadAsync()` | `Task<Stream>` | Preferred way to read file contents |

## FileSystem Helpers

Access via `FileSystem.Current`.

### Directory paths

| Property            | Purpose                        | Writable |
|---------------------|--------------------------------|----------|
| `CacheDirectory`    | Temp/cache data                | Yes      |
| `AppDataDirectory`  | Persistent app-private data    | Yes      |

### Reading bundled files

```csharp
using var stream = await FileSystem.Current.OpenAppPackageFileAsync("data.json");
using var reader = new StreamReader(stream);
string contents = await reader.ReadToEndAsync();
```

## Bundled Files (Resources/Raw)

Place files in the `Resources/Raw` folder. They receive the **MauiAsset** build action automatically.

- Files are read-only at runtime.
- Access via `OpenAppPackageFileAsync("filename.ext")`.
- Subdirectories are **flattened** on some platforms—use unique file names.

### Copy bundled file to writable location

```csharp
public async Task<string> CopyToAppDataAsync(string filename)
{
    string targetPath = Path.Combine(FileSystem.Current.AppDataDirectory, filename);

    if (!File.Exists(targetPath))
    {
        using var source = await FileSystem.Current.OpenAppPackageFileAsync(filename);
        using var dest = File.Create(targetPath);
        await source.CopyToAsync(dest);
    }

    return targetPath;
}
```

## Permissions

### Android

| Android version | Permission required                  |
|-----------------|--------------------------------------|
| ≤ 12 (API 32)  | `READ_EXTERNAL_STORAGE`              |
| ≥ 13 (API 33)  | `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO` (granular) |

Declare in `Platforms/Android/AndroidManifest.xml`. Request at runtime with `Permissions.RequestAsync<Permissions.StorageRead>()` or the granular media permissions.

### iOS

- FilePicker works without special permissions for on-device files.
- For iCloud access, enable the **iCloud** capability and configure entitlements.

### macOS (Mac Catalyst)

- Enable **App Sandbox** entitlements.
- Grant `com.apple.security.files.user-selected.read-only` (or read-write) for picker access.

### Windows

- Packaged apps have full picker access without extra declarations.

## Platform Path Differences

| Platform      | `AppDataDirectory` location                        | `CacheDirectory` location                     |
|---------------|---------------------------------------------------|------------------------------------------------|
| Android       | `/data/data/<package>/files`                      | `/data/data/<package>/cache`                   |
| iOS / macOS   | `<app-sandbox>/Library/`                          | `<app-sandbox>/Library/Caches/`                |
| Windows       | `<LocalAppData>/<PackageName>/LocalState`         | `<LocalAppData>/<PackageName>/LocalCache`      |
