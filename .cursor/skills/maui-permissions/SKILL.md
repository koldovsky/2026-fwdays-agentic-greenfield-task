---
name: maui-permissions
description: >
  .NET MAUI runtime permissions guidance — checking and requesting permissions,
  PermissionStatus handling, custom permissions via BasePlatformPermission,
  platform-specific manifest/plist declarations, and DI-friendly service patterns.
  USE FOR: "request permission", "check permission", "PermissionStatus", "runtime permission",
  "BasePlatformPermission", "custom permission", "Android manifest permission",
  "Info.plist permission", "permission denied handling".
  DO NOT USE FOR: geolocation-specific permissions (use maui-geolocation),
  camera/photo permissions (use maui-media-picker), or notification permissions (use maui-local-notifications).
---

# .NET MAUI Permissions — Gotchas & Best Practices

## Critical Anti-Patterns

### 1. Requesting without checking first

```csharp
// ❌ Shows prompt even if already granted
var status = await Permissions.RequestAsync<Permissions.Camera>();

// ✅ Check first — avoids unnecessary prompts
var status = await Permissions.CheckStatusAsync<Permissions.Camera>();
if (status != PermissionStatus.Granted)
    status = await Permissions.RequestAsync<Permissions.Camera>();
```

### 2. Calling permissions in a constructor

Permission APIs are async and require a UI context. Constructors can't await.

```csharp
// ❌ Blocks the UI thread or throws
public MyViewModel()
{
    var status = Permissions.RequestAsync<Permissions.Camera>().Result;
}

// ✅ Use OnAppearing, a command, or async initialization
protected override async void OnAppearing()
{
    await CheckAndRequestPermissionAsync<Permissions.Camera>();
}
```

### 3. Ignoring Denied and Restricted status

```csharp
// ❌ Only checks for Granted — misses edge cases
if (status == PermissionStatus.Granted) { /* proceed */ }

// ✅ Handle all relevant statuses
switch (status)
{
    case PermissionStatus.Granted: /* proceed */ break;
    case PermissionStatus.Limited: /* iOS partial access */ break;
    case PermissionStatus.Denied:
    case PermissionStatus.Restricted:
        await ShowSettingsPromptAsync(); break;
}
```

## Platform Pitfalls

### ⚠️ iOS: One-shot permission dialog

iOS shows the system permission dialog **only once per permission, ever**. After denial, `RequestAsync` returns `Denied` immediately without showing UI. You must guide the user to **Settings → App → Permission**.

### ⚠️ Android: ShouldShowRationale timing

`ShouldShowRationale` returns `true` only **after** a prior denial (but not after "Don't ask again"). Use it to show explanatory UI before re-requesting:

```csharp
if (Permissions.ShouldShowRationale<Permissions.Camera>())
{
    await Shell.Current.DisplayAlert("Permission needed",
        "Camera access is required to scan barcodes.", "OK");
}
status = await Permissions.RequestAsync<Permissions.Camera>();
```

### ⚠️ Android API 33+: StorageRead/StorageWrite are dead

On Android 13+, `StorageRead` and `StorageWrite` always return `Granted` (scoped storage makes them meaningless). Use granular media permissions instead:

```csharp
// ❌ Always returns Granted on API 33+ — gives false confidence
await Permissions.RequestAsync<Permissions.StorageRead>();

// ✅ Use the specific media permission
await Permissions.RequestAsync<Permissions.Photos>();       // photo access
await Permissions.RequestAsync<Permissions.Media>();         // audio/video
```

### ⚠️ Windows: Most permissions always return Granted

Windows doesn't have runtime permission dialogs for most features. Declare capabilities in `Package.appxmanifest` instead.

## Always-Check-Before-Request Pattern

The recommended pattern handles iOS one-shot and Android rationale:

```csharp
public async Task<PermissionStatus> CheckAndRequestPermissionAsync<T>()
    where T : Permissions.BasePermission, new()
{
    var status = await Permissions.CheckStatusAsync<T>();
    if (status == PermissionStatus.Granted)
        return status;

    if (status == PermissionStatus.Denied && DeviceInfo.Platform == DevicePlatform.iOS)
        return status; // iOS won't show dialog again

    if (Permissions.ShouldShowRationale<T>())
    {
        await Shell.Current.DisplayAlert("Permission needed",
            "This feature requires the requested permission.", "OK");
    }

    return await Permissions.RequestAsync<T>();
}
```

## Checklist

- [ ] `CheckStatusAsync` called before every `RequestAsync`
- [ ] No permission calls in constructors — use `OnAppearing` or commands
- [ ] All `PermissionStatus` values handled (`Denied`, `Restricted`, `Limited`)
- [ ] Android: `ShouldShowRationale` shown before re-requesting
- [ ] iOS: Settings navigation provided for denied permissions
- [ ] Android API 33+: using `Photos`/`Media` instead of `StorageRead`/`StorageWrite`
- [ ] Manifest/plist declarations match runtime permission requests
