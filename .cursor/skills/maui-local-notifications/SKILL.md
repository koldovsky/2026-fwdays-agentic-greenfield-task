---
name: maui-local-notifications
description: >
  Add local notifications to .NET MAUI apps on Android, iOS, and Mac Catalyst.
  Covers notification channels, permissions, scheduling, foreground/background handling,
  and DI registration. Works with XAML/MVVM, C# Markup, and MauiReactor.
  USE FOR: "local notification", "schedule notification", "notification channel",
  "notification permission", "reminder notification", "alert notification",
  "in-app notification", "foreground notification".
  DO NOT USE FOR: push notifications from a server (use maui-push-notifications),
  permission handling only (use maui-permissions), or app lifecycle background tasks (use maui-app-lifecycle).
---

# .NET MAUI Local Notifications

## Implementation overview

1. Define cross-platform `INotificationManagerService` interface and event args
2. Implement Android notification service (channel, AlarmManager, BroadcastReceiver)
3. Implement iOS/Mac Catalyst notification service (UNUserNotificationCenter)
4. Register platform implementations via DI
5. Configure platform permissions and MainActivity

See `references/local-notifications-api.md` for full implementation code.

## Platform gotchas

### Android

| Issue | Fix |
|---|---|
| Notifications silently fail on API 33+ | Must request `POST_NOTIFICATIONS` runtime permission first |
| `PendingIntent` crash on Android 12+ | Must include `PendingIntentFlags.Immutable` for API 31+ |
| Scheduled notifications lost on reboot | `AlarmManager` does **not** survive device restart — re-schedule on boot via `BOOT_COMPLETED` receiver |
| No notification appears | Channel not created — required on API 26+ (Android 8.0) |
| Notification tap doesn't return to app | `LaunchMode = LaunchMode.SingleTop` must be set on `MainActivity` |

```csharp
// ✅ Correct — API 31+ requires Immutable flag
var pendingIntentFlags = (Build.VERSION.SdkInt >= BuildVersionCodes.S)
    ? PendingIntentFlags.CancelCurrent | PendingIntentFlags.Immutable
    : PendingIntentFlags.CancelCurrent;

// ❌ Wrong — crashes on Android 12+
var pendingIntentFlags = PendingIntentFlags.CancelCurrent;
```

### iOS / Mac Catalyst

| Issue | Fix |
|---|---|
| No notification prompt appears | Permission already denied — user must re-enable in Settings |
| Foreground notifications don't show | Must implement `UNUserNotificationCenterDelegate` and set `Current.Delegate` |
| Notification shows `Alert` not `Banner` | Use `UNNotificationPresentationOptions.Banner` on iOS 14+ |

```csharp
// ✅ iOS 14+ — use Banner
completionHandler(OperatingSystem.IsIOSVersionAtLeast(14)
    ? UNNotificationPresentationOptions.Banner
    : UNNotificationPresentationOptions.Alert);

// ❌ Always using Alert — deprecated on iOS 14+
completionHandler(UNNotificationPresentationOptions.Alert);
```

### Windows

⚠️ Windows App SDK supports toast notifications but **scheduled notifications are not yet supported**. Immediate notifications work.

## DI registration — platform-specific only

```csharp
// ✅ Must use #if guards — there's no cross-platform implementation
#if ANDROID
    builder.Services.AddTransient<INotificationManagerService,
        Platforms.Android.NotificationManagerService>();
#elif IOS
    builder.Services.AddTransient<INotificationManagerService,
        Platforms.iOS.NotificationManagerService>();
#elif MACCATALYST
    builder.Services.AddTransient<INotificationManagerService,
        Platforms.MacCatalyst.NotificationManagerService>();
#endif
```

## Common anti-patterns

```csharp
// ❌ Sending without checking permission — silent failure on API 33+
notificationManager.SendNotification("Title", "Body");

// ✅ Request permission first
#if ANDROID
var status = await Permissions.RequestAsync<Platforms.Android.NotificationPermission>();
if (status != PermissionStatus.Granted) return;
#endif

// ❌ Updating UI directly from notification callback — cross-thread exception
notificationManager.NotificationReceived += (s, e) =>
    myLabel.Text = ((NotificationEventArgs)e).Title;

// ✅ Marshal to UI thread
notificationManager.NotificationReceived += (s, e) =>
    MainThread.BeginInvokeOnMainThread(() =>
        myLabel.Text = ((NotificationEventArgs)e).Title);
```

## Decision framework

| Need | Approach |
|---|---|
| Immediate notification | `SendNotification(title, message)` with `null` notifyTime |
| Scheduled reminder | `SendNotification(title, message, DateTime.Now.AddMinutes(30))` |
| Persist across reboot (Android) | Add `BOOT_COMPLETED` receiver to re-schedule alarms |
| Rich notifications (images, actions) | Extend platform implementations with native APIs |
| Push notifications from server | Use a different pattern entirely (FCM/APNs) |

## Quick checklist

- [ ] Cross-platform `INotificationManagerService` interface defined
- [ ] Android: notification channel created (API 26+)
- [ ] Android: `POST_NOTIFICATIONS` permission in manifest + runtime request (API 33+)
- [ ] Android: `PendingIntentFlags.Immutable` used (API 31+)
- [ ] Android: `MainActivity` has `LaunchMode.SingleTop` and handles `OnNewIntent`
- [ ] iOS: `UNUserNotificationCenterDelegate` set for foreground display
- [ ] iOS: `Banner` used instead of `Alert` on iOS 14+
- [ ] DI registration uses `#if` platform guards
- [ ] UI updates from notification callbacks use `MainThread.BeginInvokeOnMainThread`
