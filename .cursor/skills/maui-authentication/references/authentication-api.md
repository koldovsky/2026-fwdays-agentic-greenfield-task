# .NET MAUI Authentication — API Reference

## WebAuthenticator Core API

```csharp
var result = await WebAuthenticator.Default.AuthenticateAsync(
    new WebAuthenticatorOptions
    {
        Url = new Uri("https://your-server.com/auth/login"),
        CallbackUrl = new Uri("myapp://callback"),
        PrefersEphemeralWebBrowserSession = true
    });

string accessToken = result.AccessToken;
string refreshToken = result.Properties["refresh_token"];
```

- `Url` — the authorization endpoint (your server or identity provider).
- `CallbackUrl` — the URI scheme your app is registered to handle.
- `PrefersEphemeralWebBrowserSession` — when `true` (iOS 13+), uses a private browser session that does not share cookies or data with Safari.

## WebAuthenticator Platform Setup

### Android

#### 1. Callback Activity

```csharp
using Android.App;
using Android.Content.PM;

namespace MyApp.Platforms.Android;

[Activity(NoHistory = true, LaunchMode = LaunchMode.SingleTop, Exported = true)]
[IntentFilter(
    new[] { Android.Content.Intent.ActionView },
    Categories = new[] { Android.Content.Intent.CategoryDefault, Android.Content.Intent.CategoryBrowsable },
    DataScheme = "myapp",
    DataHost = "callback")]
public class WebAuthenticationCallbackActivity : Microsoft.Maui.Authentication.WebAuthenticatorCallbackActivity
{
}
```

#### 2. Package Visibility (Android 11+)

```xml
<manifest>
  <queries>
    <intent>
      <action android:name="android.support.customtabs.action.CustomTabsService" />
    </intent>
  </queries>
</manifest>
```

### iOS / Mac Catalyst

Register the callback URI scheme in `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>myapp</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

No additional code is needed — MAUI handles the callback automatically on Apple platforms.

### Windows

Register the protocol in `Package.appxmanifest`:

```xml
<Extensions>
  <uap:Extension Category="windows.protocol">
    <uap:Protocol Name="myapp">
      <uap:DisplayName>My App Auth</uap:DisplayName>
    </uap:Protocol>
  </uap:Extension>
</Extensions>
```

## Apple Sign In

```csharp
var result = await AppleSignInAuthenticator.Default.AuthenticateAsync(
    new AppleSignInAuthenticator.Options
    {
        IncludeFullNameScope = true,
        IncludeEmailScope = true
    });

string idToken = result.IdToken;
string name = result.Properties["name"];
```

## Token Persistence with SecureStorage

```csharp
// Save
await SecureStorage.Default.SetAsync("access_token", accessToken);
await SecureStorage.Default.SetAsync("refresh_token", refreshToken);

// Retrieve
string token = await SecureStorage.Default.GetAsync("access_token");

// Clear on logout
SecureStorage.Default.RemoveAll();
```

## DI-Friendly WebAuth Service

```csharp
public interface IAuthService
{
    Task<AuthResult> LoginAsync(CancellationToken ct = default);
    Task LogoutAsync();
    Task<string?> GetAccessTokenAsync();
}

public record AuthResult(bool Success, string? ErrorMessage = null);

public class WebAuthService : IAuthService
{
    private const string AuthUrl = "https://your-server.com/auth/login";
    private const string CallbackUrl = "myapp://callback";

    public async Task<AuthResult> LoginAsync(CancellationToken ct = default)
    {
        try
        {
            var result = await WebAuthenticator.Default.AuthenticateAsync(
                new WebAuthenticatorOptions
                {
                    Url = new Uri(AuthUrl),
                    CallbackUrl = new Uri(CallbackUrl),
                    PrefersEphemeralWebBrowserSession = true
                });

            await SecureStorage.Default.SetAsync("access_token", result.AccessToken);
            return new AuthResult(true);
        }
        catch (TaskCanceledException)
        {
            return new AuthResult(false, "Login cancelled.");
        }
    }

    public Task LogoutAsync()
    {
        SecureStorage.Default.RemoveAll();
        return Task.CompletedTask;
    }

    public Task<string?> GetAccessTokenAsync()
        => SecureStorage.Default.GetAsync("access_token");
}
```

Register in `MauiProgram.cs`:

```csharp
builder.Services.AddSingleton<IAuthService, WebAuthService>();
```

---

## MSAL.NET — Entra ID App Registration

### Manual registration

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com) → App registrations → New registration
2. Name: your app name
3. Supported account types: choose your scenario (single tenant, multi-tenant, personal accounts)
4. **Do NOT set a redirect URI yet** — add platform-specific URIs after:
   - Add a platform → **Mobile and desktop applications**
   - Android: `msal{ClientId}://auth`
   - iOS: `msauth.{BundleId}://auth`
   - Windows/macOS: `http://localhost`
5. Note the **Application (client) ID** and **Directory (tenant) ID**
6. Under API permissions, add `User.Read` (Microsoft Graph) for basic profile access
7. If calling your own API: register the API app separately, expose a scope (e.g., `access_as_user`), then add that scope as a permission to the client app

### Install the Entra provisioning skill (automated alternative)

```bash
mkdir -p .github/skills && cd .github/skills
curl -LO https://aka.ms/msidweb/aspire/entra-id-provisioning-skill
```

Then ask your AI assistant: **"Provision Entra ID app registrations for my MAUI app"**

Source: https://github.com/AzureAD/microsoft-identity-web/tree/master/.github/skills

## MSAL.NET Configuration

```json
{
  "AzureAd": {
    "Authority": "https://login.microsoftonline.com/{TenantId}",
    "TenantId": "<your-tenant-id>",
    "ClientId": "<your-client-id>",
    "Scopes": "User.Read"
  }
}
```

Or use a config class for mobile:

```csharp
public static class AuthConfig
{
    public const string TenantId = "<your-tenant-id>";
    public const string ClientId = "<your-client-id>";
    public const string Authority = $"https://login.microsoftonline.com/{TenantId}";
    public static readonly string[] Scopes = ["User.Read"];

    public const string AndroidRedirectUri = $"msal{ClientId}://auth";
    public const string IosRedirectUri = $"msauth.com.companyname.myapp://auth";
}
```

## MSAL Auth Service

```csharp
public interface IAuthService
{
    Task<AuthenticationResult?> SignInAsync(CancellationToken ct = default);
    Task<AuthenticationResult?> AcquireTokenSilentAsync(CancellationToken ct = default);
    Task SignOutAsync();
    Task<string?> GetAccessTokenAsync(string[] scopes, CancellationToken ct = default);
    bool IsSignedIn { get; }
}
```

```csharp
using Microsoft.Identity.Client;

public class MsalAuthService : IAuthService
{
    private readonly IPublicClientApplication _pca;
    private readonly string[] _defaultScopes;

    public bool IsSignedIn => _cachedAccount != null;
    private IAccount? _cachedAccount;

    public MsalAuthService()
    {
        _defaultScopes = AuthConfig.Scopes;

        var builder = PublicClientApplicationBuilder
            .Create(AuthConfig.ClientId)
            .WithAuthority(AuthConfig.Authority)
            .WithIosKeychainSecurityGroup("com.microsoft.adalcache");

#if ANDROID
        builder = builder.WithRedirectUri(AuthConfig.AndroidRedirectUri)
                         .WithParentActivityOrWindow(() => Platform.CurrentActivity);
#elif IOS || MACCATALYST
        builder = builder.WithRedirectUri(AuthConfig.IosRedirectUri);
#else
        builder = builder.WithRedirectUri("http://localhost");
#endif

#if ANDROID || IOS
        builder = builder.WithBroker();
#endif

        _pca = builder.Build();
    }

    public async Task<AuthenticationResult?> SignInAsync(CancellationToken ct = default)
    {
        var result = await AcquireTokenSilentAsync(ct);
        if (result != null) return result;

        try
        {
            result = await _pca.AcquireTokenInteractive(_defaultScopes)
                .WithLoginHint(_cachedAccount?.Username)
#if ANDROID
                .WithParentActivityOrWindow(Platform.CurrentActivity)
#endif
                .ExecuteAsync(ct);

            _cachedAccount = result.Account;
            return result;
        }
        catch (MsalClientException ex) when (ex.ErrorCode == "authentication_canceled")
        {
            return null;
        }
    }

    public async Task<AuthenticationResult?> AcquireTokenSilentAsync(CancellationToken ct = default)
    {
        try
        {
            var accounts = await _pca.GetAccountsAsync();
            _cachedAccount = accounts.FirstOrDefault();

            if (_cachedAccount == null) return null;

            var result = await _pca.AcquireTokenSilent(_defaultScopes, _cachedAccount)
                .ExecuteAsync(ct);

            _cachedAccount = result.Account;
            return result;
        }
        catch (MsalUiRequiredException)
        {
            return null;
        }
    }

    public async Task<string?> GetAccessTokenAsync(string[] scopes, CancellationToken ct = default)
    {
        var accounts = await _pca.GetAccountsAsync();
        var account = accounts.FirstOrDefault();
        if (account == null) return null;

        try
        {
            var result = await _pca.AcquireTokenSilent(scopes, account)
                .ExecuteAsync(ct);
            return result.AccessToken;
        }
        catch (MsalUiRequiredException)
        {
            var result = await _pca.AcquireTokenInteractive(scopes)
#if ANDROID
                .WithParentActivityOrWindow(Platform.CurrentActivity)
#endif
                .ExecuteAsync(ct);
            _cachedAccount = result.Account;
            return result.AccessToken;
        }
    }

    public async Task SignOutAsync()
    {
        var accounts = await _pca.GetAccountsAsync();
        foreach (var account in accounts)
        {
            await _pca.RemoveAsync(account);
        }
        _cachedAccount = null;
    }
}
```

Register in `MauiProgram.cs`:

```csharp
builder.Services.AddSingleton<IAuthService, MsalAuthService>();
```

## MSAL Platform Setup

### Android

#### AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:allowBackup="true" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.INTERNET" />
  <queries>
    <package android:name="com.azure.authenticator" />
    <package android:name="com.microsoft.windowsintune.companyportal" />
    <intent>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="https" />
    </intent>
    <intent>
      <action android:name="android.support.customtabs.action.CustomTabsService" />
    </intent>
  </queries>
</manifest>
```

#### MainActivity.cs

```csharp
using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using Android.Runtime;
using Microsoft.Identity.Client;

namespace MyApp;

[Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true,
    ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation |
    ConfigChanges.UiMode | ConfigChanges.ScreenLayout |
    ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnActivityResult(int requestCode,
        [GeneratedEnum] Result resultCode, Intent? data)
    {
        base.OnActivityResult(requestCode, resultCode, data);
        AuthenticationContinuationHelper
            .SetAuthenticationContinuationEventArgs(requestCode, resultCode, data);
    }
}
```

### iOS / Mac Catalyst

#### Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.companyname.myapp</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>msauth.com.companyname.myapp</string>
    </array>
  </dict>
</array>
```

#### Entitlements.plist

```xml
<key>keychain-access-groups</key>
<array>
  <string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>
</array>
```

#### AppDelegate.cs

```csharp
using Foundation;
using Microsoft.Identity.Client;
using UIKit;

namespace MyApp;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool OpenUrl(UIApplication app, NSUrl url,
        NSDictionary options)
    {
        AuthenticationContinuationHelper.SetAuthenticationContinuationEventArgs(url);
        return base.OpenUrl(app, url, options);
    }
}
```

### Windows

No special platform setup. MSAL uses `http://localhost` redirect by default.
For broker (WAM) support on Windows, add:

```csharp
#if WINDOWS
using Microsoft.Identity.Client.Desktop;

builder = builder.WithBroker(new BrokerOptions(BrokerOptions.OperatingSystems.Windows));
#endif
```

## Bearer Token DelegatingHandler

```csharp
public class AuthTokenHandler : DelegatingHandler
{
    private readonly IAuthService _authService;
    private readonly string[] _scopes;

    public AuthTokenHandler(IAuthService authService, string[] scopes)
    {
        _authService = authService;
        _scopes = scopes;
        InnerHandler = new HttpClientHandler();
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await _authService.GetAccessTokenAsync(_scopes, ct);
        if (token != null)
        {
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }
        return await base.SendAsync(request, ct);
    }
}
```

Register in `MauiProgram.cs`:

```csharp
builder.Services.AddTransient(sp =>
    new AuthTokenHandler(
        sp.GetRequiredService<IAuthService>(),
        new[] { "api://<your-api-client-id>/access_as_user" }));

builder.Services.AddHttpClient<IMyApiClient, MyApiClient>(client =>
{
    client.BaseAddress = new Uri("https://your-api.azurewebsites.net/");
})
.AddHttpMessageHandler<AuthTokenHandler>();
```

## Login UI Examples

### XAML + ViewModel

```xaml
<Button Text="{Binding LoginButtonText}"
        Command="{Binding LoginCommand}" />
```

```csharp
public partial class AuthViewModel : ObservableObject
{
    private readonly IAuthService _auth;

    [ObservableProperty] string loginButtonText = "Sign In";
    [ObservableProperty] string? userName;

    public AuthViewModel(IAuthService auth) => _auth = auth;

    [RelayCommand]
    async Task Login()
    {
        if (_auth.IsSignedIn)
        {
            await _auth.SignOutAsync();
            UserName = null;
            LoginButtonText = "Sign In";
        }
        else
        {
            var result = await _auth.SignInAsync();
            if (result != null)
            {
                UserName = result.Account.Username;
                LoginButtonText = "Sign Out";
            }
        }
    }
}
```

### Blazor Hybrid

```razor
@inject IAuthService Auth

<AuthorizeView>
    <Authorized>
        <span>Hello, @context.User.Identity?.Name</span>
        <button @onclick="SignOut">Sign Out</button>
    </Authorized>
    <NotAuthorized>
        <button @onclick="SignIn">Sign In</button>
    </NotAuthorized>
</AuthorizeView>

@code {
    async Task SignIn() => await Auth.SignInAsync();
    async Task SignOut() => await Auth.SignOutAsync();
}
```

### MsalAuthenticationStateProvider (for Blazor Hybrid)

```csharp
public class MsalAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly IAuthService _auth;

    public MsalAuthenticationStateProvider(IAuthService auth) => _auth = auth;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var result = await _auth.AcquireTokenSilentAsync();
        if (result == null)
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));

        var identity = new ClaimsIdentity(result.ClaimsPrincipal.Claims, "msal");
        return new AuthenticationState(new ClaimsPrincipal(identity));
    }

    public void NotifyAuthStateChanged() =>
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
}
```

Register:

```csharp
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, MsalAuthenticationStateProvider>();
```

## Entra ID + Aspire Backend

If your MAUI app calls a .NET Aspire-hosted backend API, the API-side
JWT Bearer protection is handled by the Entra team's existing skills.

### Install the Entra authentication skill (for the API/backend)

```bash
mkdir -p .github/skills && cd .github/skills
curl -LO https://aka.ms/msidweb/aspire/entra-id-code-skill
```

Then ask: **"Add Entra ID authentication to my Aspire app"**

Source: https://github.com/AzureAD/microsoft-identity-web/tree/master/.github/skills
