---
name: maui-authentication
description: >
  Add authentication to .NET MAUI apps. Covers WebAuthenticator for generic
  OAuth 2.0 / social login, and MSAL.NET for Microsoft Entra ID (Azure AD)
  with broker support (Microsoft Authenticator), token caching, Conditional
  Access, platform-specific setup (Android, iOS, Windows), DelegatingHandler
  for bearer token API calls, and Blazor Hybrid integration.
  USE FOR: "add authentication", "OAuth login", "MSAL.NET", "social login",
  "WebAuthenticator", "Entra ID MAUI", "Azure AD login", "Google login MAUI",
  "Apple login MAUI", "token caching", "bearer token", "sign in".
  DO NOT USE FOR: secure local storage of tokens (use maui-secure-storage),
  Aspire-specific auth setup (use maui-aspire), or server-side Entra ID provisioning
  (use entra-id-aspire-provisioning).
---

# .NET MAUI Authentication

## Security: Never Embed Secrets

> ❌ **Never embed client secrets, API keys, or signing keys in a mobile app binary.** They can be extracted trivially via decompilation.

The correct pattern:
1. App calls `WebAuthenticator` pointing to **your server** endpoint
2. Server initiates the OAuth flow with the identity provider (holds the client secret)
3. Provider redirects back to your server with an auth code
4. Server exchanges the code for tokens and returns them to the app via the callback URI

## WebAuthenticator Gotchas

### ⚠️ Windows WebAuthenticator is broken

Windows WebAuthenticator is currently broken. See [dotnet/maui#2702](https://github.com/dotnet/maui/issues/2702). Use MSAL or a WinUI-specific workaround for Windows auth flows.

### ⚠️ Apple Sign In returns name/email only once

Apple only returns the user's name and email on the **first** sign-in. Cache them immediately — subsequent sign-ins won't include them.

### ⚠️ PrefersEphemeralWebBrowserSession

Set to `true` on iOS 13+ to force a fresh login prompt. When `false` (default), the auth session shares cookies with Safari — the user may be auto-logged in, which can confuse logout/switch-account flows.

### ⚠️ Callback URI mismatches

The most common auth failure is a URI scheme mismatch. The `CallbackUrl` in code must exactly match:
- Android: `DataScheme` + `DataHost` in the `IntentFilter`
- iOS: `CFBundleURLSchemes` in `Info.plist`
- Windows: `Protocol Name` in `Package.appxmanifest`

## WebAuthenticator Checklist

- [ ] Callback URI scheme matches across all platform configs and `CallbackUrl`
- [ ] Android has `WebAuthenticatorCallbackActivity` with correct `IntentFilter`
- [ ] Android 11+ has `<queries>` for Custom Tabs in the manifest
- [ ] iOS/Mac Catalyst has `CFBundleURLTypes` in `Info.plist`
- [ ] Client secrets are on the server, not in the app
- [ ] Tokens stored with `SecureStorage`, cleared on logout
- [ ] `TaskCanceledException` handled gracefully in UI

---

## Choosing Between WebAuthenticator and MSAL.NET

| Criteria | WebAuthenticator | MSAL.NET |
|----------|-----------------|----------|
| Identity provider | Any OAuth 2.0 / OIDC | Microsoft Entra ID |
| Broker support (SSO) | ❌ No | ✅ Microsoft Authenticator, Company Portal |
| Conditional Access / MFA | ❌ Manual | ✅ Built-in |
| Token cache & refresh | ❌ Manual (SecureStorage) | ✅ Automatic |
| Complexity | Simple | More setup |
| Use when | Google, Apple, generic OIDC | Entra ID / Azure AD, Microsoft Graph |

---

## MSAL.NET Gotchas

### ⚠️ Android: OnActivityResult is required

Forgetting `AuthenticationContinuationHelper.SetAuthenticationContinuationEventArgs` in `MainActivity.OnActivityResult` causes auth to hang silently after the browser returns.

### ⚠️ iOS: Keychain sharing is required

Without `Entitlements.plist` containing keychain group `com.microsoft.adalcache`, token caching fails silently and users are prompted to sign in every time.

### ⚠️ Handle MsalUiRequiredException

When `AcquireTokenSilent` throws `MsalUiRequiredException`, the cached token is expired and interaction is needed. Always fall back to `AcquireTokenInteractive`.

```csharp
// ❌ Ignoring MsalUiRequiredException — user gets a crash
var result = await _pca.AcquireTokenSilent(scopes, account).ExecuteAsync(ct);

// ✅ Fall back to interactive when silent fails
try
{
    result = await _pca.AcquireTokenSilent(scopes, account).ExecuteAsync(ct);
}
catch (MsalUiRequiredException)
{
    result = await _pca.AcquireTokenInteractive(scopes).ExecuteAsync(ct);
}
```

### ⚠️ Handle user cancellation gracefully

```csharp
// ✅ Don't treat cancellation as an error
catch (MsalClientException ex) when (ex.ErrorCode == "authentication_canceled")
{
    return null;  // User cancelled — not an error
}
```

### ⚠️ Blazor Hybrid: Auth happens at the MAUI layer

In MAUI Blazor Hybrid apps, authentication must happen at the **MAUI layer** (MSAL.NET), not in the Blazor WebView. Don't use `AddMicrosoftIdentityWebApp` or server-side OIDC patterns. Instead:
1. MAUI handles sign-in via `IAuthService` (MSAL.NET)
2. A custom `MsalAuthenticationStateProvider` exposes auth state to Blazor
3. `HttpClient` with `DelegatingHandler` attaches bearer tokens automatically

## MSAL.NET Checklist

- [ ] `Microsoft.Identity.Client` NuGet package added
- [ ] App registration created in Entra ID with correct redirect URIs
- [ ] `AuthConfig` / `appsettings.json` has ClientId, TenantId, Scopes
- [ ] Android: `AndroidManifest.xml` has `<queries>` for broker and browsers
- [ ] Android: `MainActivity.OnActivityResult` calls `AuthenticationContinuationHelper`
- [ ] iOS: `Info.plist` has `CFBundleURLSchemes` with `msauth.{BundleId}`
- [ ] iOS: `Entitlements.plist` has keychain group `com.microsoft.adalcache`
- [ ] iOS: `AppDelegate.OpenUrl` calls `AuthenticationContinuationHelper`
- [ ] `IAuthService` registered as singleton in DI
- [ ] `DelegatingHandler` attached to `HttpClient` for API calls
- [ ] Login/logout UI wired up
- [ ] `MsalUiRequiredException` handled (triggers interactive sign-in)
- [ ] `MsalClientException` with `authentication_canceled` handled gracefully
