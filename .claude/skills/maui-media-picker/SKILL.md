---
name: maui-media-picker
description: >-
  Guidance for picking photos/videos, capturing from camera, multi-select (.NET 10),
  MediaPickerOptions, platform permissions, and FileResult handling in .NET MAUI.
  USE FOR: "pick photo", "capture photo", "take picture", "pick video", "camera capture",
  "MediaPicker", "photo gallery", "image picker", "multi-select photos", "MediaPickerOptions".
  DO NOT USE FOR: general file picking (use maui-file-handling),
  image display or optimization (use maui-performance), or camera streaming (use maui-platform-invoke).
---

# .NET MAUI Media Picker — Gotchas & Best Practices

## Common Mistakes

### 1. Forgetting to check for cancellation

Single-select returns `null`, multi-select returns an empty list. Not checking causes `NullReferenceException`.

```csharp
// ❌ Crashes when user cancels
var photo = await MediaPicker.Default.PickPhotoAsync();
using var stream = await photo.OpenReadAsync();

// ✅ Always check for null / empty
var photo = await MediaPicker.Default.PickPhotoAsync();
if (photo is null) return;
using var stream = await photo.OpenReadAsync();
```

### 2. Calling from a background thread

All `MediaPicker` methods **must** run on the UI thread or they throw.

```csharp
// ❌ Will throw on some platforms
await Task.Run(async () => await MediaPicker.Default.PickPhotoAsync());

// ✅ Call directly from a command or event handler on the UI thread
var photo = await MediaPicker.Default.PickPhotoAsync();
```

### 3. Not checking IsCaptureSupported

Devices without cameras (emulators, some tablets) will throw if you call capture methods.

```csharp
// ❌ Crashes on devices without a camera
var photo = await MediaPicker.Default.CapturePhotoAsync();

// ✅ Guard with capability check
if (MediaPicker.Default.IsCaptureSupported)
{
    var photo = await MediaPicker.Default.CapturePhotoAsync();
}
```

### 4. Not disposing streams

`OpenReadAsync()` returns a stream that must be disposed.

```csharp
// ❌ Leaks the stream
var stream = await photo.OpenReadAsync();
var bytes = ReadAllBytes(stream);

// ✅ Dispose with using
using var stream = await photo.OpenReadAsync();
```

## Platform Pitfalls

### ⚠️ SelectionLimit is not enforced on Android/Windows

`MediaPickerOptions.SelectionLimit` is advisory. Always validate the count yourself:

```csharp
var options = new MediaPickerOptions { SelectionLimit = 5 };
var results = await MediaPicker.Default.PickPhotosAsync(options);
if (results.Count() > 5)
{
    // Warn user or take only the first 5
    results = results.Take(5);
}
```

### ⚠️ Android storage permissions split at API 33

- API ≤ 32: needs `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`
- API ≥ 33: needs `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (broad storage permissions are ignored)
- Use `android:maxSdkVersion="32"` on the old permissions to avoid Play Store warnings

### ⚠️ iOS requires all four plist keys for full functionality

Missing any one of `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
`NSPhotoLibraryUsageDescription`, or `NSPhotoLibraryAddUsageDescription` causes
a runtime crash when that feature is accessed.

### ⚠️ Android requires `<queries>` for camera intents

Without the `IMAGE_CAPTURE` query in `AndroidManifest.xml`, `CapturePhotoAsync`
may fail silently on Android 11+ due to package visibility restrictions.

## Decision Framework

| Scenario | Method |
|---|---|
| User picks one photo | `PickPhotoAsync()` |
| User picks multiple (.NET 10+) | `PickPhotosAsync()` with `SelectionLimit` |
| App needs camera capture | Check `IsCaptureSupported` → `CapturePhotoAsync()` |
| Save picked file permanently | Copy stream to `FileSystem.AppDataDirectory` |
| Need photo metadata | Set `PreserveMetaData = true` in `MediaPickerOptions` |

## Checklist

- [ ] All picker calls run on the UI thread
- [ ] Null/empty checks after every pick/capture call
- [ ] `IsCaptureSupported` guard before capture methods
- [ ] Streams disposed with `using`
- [ ] Android manifest has both old and new storage permissions with `maxSdkVersion`
- [ ] Android manifest has `<queries>` block for camera intent
- [ ] iOS `Info.plist` has all four usage description keys
- [ ] `SelectionLimit` validated in code, not trusted from platform
