# Permissions API Reference

## Core API

```csharp
using Microsoft.Maui.ApplicationModel;

// Check current status
PermissionStatus status = await Permissions.CheckStatusAsync<Permissions.Camera>();

// Request permission
status = await Permissions.RequestAsync<Permissions.Camera>();

// Android: check if rationale should be shown after prior denial
bool showRationale = Permissions.ShouldShowRationale<Permissions.Camera>();
```

## PermissionStatus Enum

| Value        | Meaning                                                |
|--------------|--------------------------------------------------------|
| `Unknown`    | Status unknown or not supported on platform            |
| `Denied`     | User denied the permission                             |
| `Disabled`   | Feature is disabled on the device                      |
| `Granted`    | User granted permission                                |
| `Restricted` | Permission restricted by policy (iOS parental, etc.)   |
| `Limited`    | Partial access granted (iOS limited photo access)      |

## Available Permissions

`Battery`, `Bluetooth`, `CalendarRead`, `CalendarWrite`, `Camera`,
`ContactsRead`, `ContactsWrite`, `Flashlight`, `LocationWhenInUse`,
`LocationAlways`, `Media`, `Microphone`, `NearbyWifiDevices`,
`NetworkState`, `Phone`, `Photos`, `PhotosAddOnly`, `PhotosReadWrite`,
`PostNotifications`, `Reminders`, `Sensors`, `Sms`, `Speech`,
`StorageRead`, `StorageWrite`, `Vibrate`

Access via `Permissions.<Name>`, e.g. `Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>()`.

## Custom Permissions

Extend `BasePlatformPermission` and override platform-specific required permissions:

```csharp
public class ReadExternalStoragePermission : Permissions.BasePlatformPermission
{
#if ANDROID
    public override (string androidPermission, bool isRuntime)[] RequiredPermissions =>
        new (string, bool)[]
        {
            ("android.permission.READ_EXTERNAL_STORAGE", true)
        };
#endif
}

// Usage
var status = await Permissions.RequestAsync<ReadExternalStoragePermission>();
```

## Platform Permission Declarations

### Android

Declare permissions in `Platforms/Android/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS

Declare usage descriptions in `Platforms/iOS/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs your location for nearby search.</string>
```

### Windows

Most permissions return `Granted` or `Unknown`. Declare capabilities in
`Platforms/Windows/Package.appxmanifest` under `<Capabilities>`.

### Mac Catalyst

Follows iOS patterns. Add usage descriptions to `Info.plist` and
entitlements to `Entitlements.plist` as needed.

## DI-Friendly Permission Service

```csharp
public interface IPermissionService
{
    Task<PermissionStatus> CheckAndRequestAsync<T>() where T : Permissions.BasePermission, new();
}

public class PermissionService : IPermissionService
{
    public async Task<PermissionStatus> CheckAndRequestAsync<T>() where T : Permissions.BasePermission, new()
    {
        var status = await Permissions.CheckStatusAsync<T>();
        if (status == PermissionStatus.Granted)
            return status;

        if (Permissions.ShouldShowRationale<T>())
        {
            await Shell.Current.DisplayAlert("Permission required",
                "Please grant the requested permission to use this feature.", "OK");
        }

        return await Permissions.RequestAsync<T>();
    }
}

// Registration
builder.Services.AddSingleton<IPermissionService, PermissionService>();
```
