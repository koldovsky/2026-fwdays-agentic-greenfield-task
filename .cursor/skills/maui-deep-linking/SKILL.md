---
name: maui-deep-linking
description: >
  Guide for implementing deep linking in .NET MAUI apps. Covers Android App Links
  with intent filters, Digital Asset Links, and AutoVerify; iOS Universal Links with
  Associated Domains entitlements and Apple App Site Association files; custom URI
  schemes; and domain verification for both platforms.
  USE FOR: "deep linking", "app links", "universal links", "custom URI scheme",
  "intent filter", "Associated Domains", "Digital Asset Links", "open app from URL",
  "handle incoming URL", "domain verification".
  DO NOT USE FOR: in-app Shell navigation (use maui-shell-navigation),
  push notification handling (use maui-push-notifications), or web content embedding (use maui-hybridwebview).
---

# .NET MAUI Deep Linking

## Platform Gotchas

### Android

- **`AutoVerify = true` is required** on the `IntentFilter` for App Links (not
  just deep links). Without it, Android shows a disambiguation dialog instead
  of opening your app directly.
- **Handle intent in both `OnCreate` and `OnNewIntent`.**
  `OnCreate` fires for cold starts; `OnNewIntent` fires when the app is already
  running. Missing either means links silently fail in one scenario.

```csharp
// ❌ Only handles cold-start links
protected override void OnCreate(Bundle? savedInstanceState)
{
    base.OnCreate(savedInstanceState);
    HandleDeepLink(Intent);
}

// ✅ Handles both cold-start and warm-start links
protected override void OnCreate(Bundle? savedInstanceState)
{
    base.OnCreate(savedInstanceState);
    HandleDeepLink(Intent);
}
protected override void OnNewIntent(Intent? intent)
{
    base.OnNewIntent(intent);
    HandleDeepLink(intent);
}
```

- **SHA-256 fingerprint must match the signing key** used for the build you're
  testing. Debug and release builds use different keys — update
  `assetlinks.json` accordingly or verification silently fails.
- **Test verification status** with:
  ```bash
  adb shell pm get-app-links com.example.myapp
  ```
  Look for `verified` status, not just `ask`.

### iOS

- ⚠️ **Universal Links do NOT work in the Simulator.** You must test on a
  physical device.
- **AASA changes take up to 24 hours** to propagate through Apple's CDN
  (iOS 14+). During development, use the `?mode=developer` query param or
  Apple's CDN diagnostics: `swcutil dl -d example.com`.
- **Handle all three entry points**: `FinishedLaunching`, `ContinueUserActivity`,
  and `SceneWillConnect`. Missing any one causes links to fail for specific
  app states (cold start, background resume, or scene-based launch).
- **`applinks:` prefix is required** in the Associated Domains entitlement.
  Writing just `example.com` instead of `applinks:example.com` silently fails.

---

## Common Mistakes

### Forgetting `MainThread.BeginInvokeOnMainThread`

Deep link callbacks can fire on background threads. Shell navigation must run
on the main thread.

```csharp
// ❌ May crash — GoToAsync called off the main thread
static void HandleUniversalLink(string? url)
{
    if (string.IsNullOrEmpty(url)) return;
    Shell.Current.GoToAsync(MapToRoute(url));
}

// ✅ Dispatch to main thread
static void HandleUniversalLink(string? url)
{
    if (string.IsNullOrEmpty(url)) return;
    MainThread.BeginInvokeOnMainThread(async () =>
        await Shell.Current.GoToAsync(MapToRoute(url)));
}
```

### Route not registered before navigation

Register Shell routes in `AppShell` constructor **before** any deep link can
fire. If the route doesn't exist, `GoToAsync` throws silently or navigates
to root.

### Custom URI schemes vs. App Links / Universal Links

| Approach | Verified | Fallback to browser | Recommended |
|---|---|---|---|
| Custom URI scheme (`myapp://`) | No | No | Only for app-to-app communication |
| Android App Links (`https://`) | Yes | Yes | ✅ Production web links |
| iOS Universal Links (`https://`) | Yes | Yes | ✅ Production web links |

> ⚠️ Custom URI schemes are **not verified** — any app can register the same
> scheme. Use `https://` App Links / Universal Links for user-facing URLs.

---

## Debugging Checklist

- [ ] Android: `IntentFilter` has `AutoVerify = true` on `MainActivity`
- [ ] Android: `assetlinks.json` at `/.well-known/` with correct SHA-256 for current signing key
- [ ] Android: Intent handled in both `OnCreate` and `OnNewIntent`
- [ ] Android: Verified with `adb shell pm get-app-links`
- [ ] iOS: `applinks:example.com` in Associated Domains entitlement (not just `example.com`)
- [ ] iOS: AASA file at `/.well-known/apple-app-site-association` with correct Team ID
- [ ] iOS: All three lifecycle entry points handled
- [ ] iOS: Tested on **physical device** (not simulator)
- [ ] Shell routes registered before deep link callbacks fire
- [ ] Navigation dispatched to main thread
