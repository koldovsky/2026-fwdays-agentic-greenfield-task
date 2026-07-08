---
name: maui-push-notifications
description: >
  End-to-end guide for adding push notifications to .NET MAUI apps.
  Covers Firebase Cloud Messaging (Android), Apple Push Notification Service (iOS),
  Azure Notification Hubs as the cross-platform broker, an ASP.NET Core backend API,
  and the MAUI client wiring on every platform.
  USE FOR: "push notification", "FCM", "APNS", "Firebase Cloud Messaging",
  "Azure Notification Hubs", "device registration", "remote notification",
  "send push notification", "notification token".
  DO NOT USE FOR: local/scheduled notifications (use maui-local-notifications),
  general permission handling (use maui-permissions), or background tasks without notifications (use maui-app-lifecycle).
---

# Push Notifications — Gotchas & Best Practices

## Troubleshooting Table

| Issue | Cause | Fix |
|-------|-------|-----|
| Token changes every debug run (Android) | Debug builds regenerate Firebase tokens | Always re-register in `OnNewToken` |
| `HttpClient` requests fail silently | `BaseAddress` missing trailing `/` | Ensure endpoint ends with `/` |
| iOS push won't arrive on simulator | Simulators don't support APNS | Use a **physical iOS device** |
| No notifications on Android 13+ | `POST_NOTIFICATIONS` required (API 33+) | Call `RequestPermissions` in `OnCreate` |
| Notification channel missing (API 26+) | Android requires explicit channel creation | Create channel before sending |
| `SendNotificationAsync` throws for >20 tags | Azure NH tag expression limit | Batch tags in groups of 20 |
| `422` on device registration | Platform string mismatch | Use `"fcmv1"` (not `"gcm"`) and `"apns"` |
| Token empty at `RegisterAsync` | Race condition on cold start | Guard with `IsNullOrWhiteSpace` check |

## Critical Gotchas

### ⚠️ BaseAddress trailing slash

`HttpClient.BaseAddress` **must** end with `/`. Without it, relative URI resolution silently breaks.

```csharp
// ❌ Relative URIs resolve incorrectly
_http = new HttpClient { BaseAddress = new Uri("https://example.com") };

// ✅ Trailing slash required
_http = new HttpClient { BaseAddress = new Uri("https://example.com/") };
```

### ⚠️ Android: Always re-register on token refresh

Firebase tokens regenerate frequently in debug builds. If you skip `OnNewToken`, the backend holds a stale token and pushes silently fail.

```csharp
// ❌ Only registering once at startup
// (token may change later without re-registration)

// ✅ Always re-register in OnNewToken
public override void OnNewToken(string token)
{
    var svc = IPlatformApplication.Current?.Services.GetService<IPushNotificationService>();
    if (svc is null) return;
    svc.Token = token;
    _ = svc.RegisterAsync();
}
```

### ⚠️ Android 13+ requires POST_NOTIFICATIONS permission

Without explicitly requesting `POST_NOTIFICATIONS` on API 33+, notifications are silently dropped.

### ⚠️ Azure NH tag expression limit: 20 tags

`SendNotificationAsync` throws if a tag expression references more than 20 tags. Batch into chunks:

```csharp
// ✅ Batch tags to stay under the limit
var batches = request.Tags.Chunk(20);
foreach (var batch in batches)
{
    var tagExpr = string.Join(" || ", batch);
    await _hub.SendFcmV1NativeNotificationAsync(payload, tagExpr, ct);
}
```

### ⚠️ Use "fcmv1" not "gcm"

The legacy `"gcm"` platform string causes `422` errors on device registration. Always use `"fcmv1"` for Android and `"apns"` for iOS.

### ⚠️ iOS simulators cannot receive push notifications

APNS only works on physical iOS devices. Simulators silently ignore push registrations.

## Platform Checklist

### Android
- [ ] `google-services.json` in `Platforms/Android/` with `<GoogleServicesJson>` in `.csproj`
- [ ] `Xamarin.Firebase.Messaging` NuGet package added (Android-only condition)
- [ ] `POST_NOTIFICATIONS` permission requested on API 33+
- [ ] Notification channel created before first notification (API 26+)
- [ ] `OnNewToken` always calls `RegisterAsync`
- [ ] `FirebaseMessagingService` registered in manifest with `MESSAGING_EVENT` intent filter

### iOS
- [ ] Push Notifications capability enabled in Apple Developer portal
- [ ] APNs key (`.p8`) uploaded to Azure Notification Hub
- [ ] `Entitlements.plist` with `aps-environment` set to `development` or `production`
- [ ] `CodesignEntitlements` set in `.csproj`
- [ ] `RegisterForRemoteNotifications` called on main thread after authorization grant
- [ ] Device token converted to lowercase hex string (no dashes)

### Backend
- [ ] Azure Notification Hub configured with FCM V1 JSON and APNS key
- [ ] `BaseAddress` ends with trailing `/`
- [ ] Tag expressions batched in groups of ≤20
- [ ] Platform strings: `"fcmv1"` and `"apns"` (not legacy values)

## Architecture Overview

```
MAUI app → ASP.NET Core backend → Azure Notification Hub → FCM / APNS → device
```

See `references/push-notifications-api.md` for full implementation templates.
