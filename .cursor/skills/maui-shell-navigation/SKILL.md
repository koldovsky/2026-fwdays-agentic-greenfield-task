---
name: maui-shell-navigation
description: >
  .NET MAUI Shell navigation guidance — Shell visual hierarchy, AppShell setup,
  tab bars, flyout menus, URI-based navigation with GoToAsync, route registration,
  query parameters, back navigation, and navigation events.
  USE FOR: "Shell navigation", "GoToAsync", "AppShell", "tab bar", "flyout menu",
  "route registration", "query parameters navigation", "back navigation",
  "Shell tabs", "URI navigation", "navigation events".
  DO NOT USE FOR: deep linking from external URLs (use maui-deep-linking),
  data binding on pages (use maui-data-binding), or dependency injection setup (use maui-dependency-injection).
---

# .NET MAUI Shell Navigation

## Key decisions

### ContentTemplate — always use it

Always use `ContentTemplate` with `DataTemplate` so pages are created on demand.
Using `Content` directly creates **all** pages during Shell init, hurting startup time.

```xml
<!-- ✅ Lazy — page created on first navigation -->
<ShellContent ContentTemplate="{DataTemplate views:HomePage}" />

<!-- ❌ Eager — page created at Shell startup -->
<ShellContent>
    <views:HomePage />
</ShellContent>
```

### Passing data — prefer IQueryAttributable over QueryProperty

`IQueryAttributable` gives you all parameters in one call and works on ViewModels:

```csharp
public class AnimalDetailsViewModel : ObservableObject, IQueryAttributable
{
    public void ApplyQueryAttributes(IDictionary<string, object> query)
    {
        if (query.TryGetValue("id", out var id))
            AnimalId = id.ToString();
    }
}
```

For complex objects, use `ShellNavigationQueryParameters` to avoid serializing:

```csharp
var parameters = new ShellNavigationQueryParameters
{
    { "animal", selectedAnimal }
};
await Shell.Current.GoToAsync("animaldetails", parameters);
```

### Guarding navigation — async deferral pattern

Use `GetDeferral()` for async checks (e.g., "save unsaved changes?"):

```csharp
protected override async void OnNavigating(ShellNavigatingEventArgs args)
{
    base.OnNavigating(args);
    if (hasUnsavedChanges && args.Source == ShellNavigationSource.Pop)
    {
        var deferral = args.GetDeferral();
        bool discard = await ShowConfirmationDialog();
        if (!discard)
            args.Cancel();
        deferral.Complete();
    }
}
```

## Common gotchas

1. **Duplicate route names** — `Routing.RegisterRoute` throws `ArgumentException`
   if a route name is already registered or matches a visual hierarchy route.
   Every route must be unique across the entire app.

2. **Relative routes require registration** — you cannot `GoToAsync("somepage")`
   unless `somepage` was registered with `Routing.RegisterRoute`. Visual hierarchy
   pages use absolute `//` routes instead.

3. **Pages are created on demand** — when using `ContentTemplate`, the page
   constructor runs only on first navigation. Don't assume pages exist at startup.

4. **Tab.Stack is read-only** — you cannot manipulate the navigation stack directly;
   use `GoToAsync` for all navigation changes.

5. **GoToAsync is async — always await it** — fire-and-forget navigation causes
   race conditions and can silently fail:
   ```csharp
   // ❌ Fire-and-forget — race conditions
   Shell.Current.GoToAsync("details");

   // ✅ Always await
   await Shell.Current.GoToAsync("details");
   ```

6. **Route hierarchy matters** — absolute routes must match the full path through
   the visual hierarchy (`//FlyoutItem/Tab/ShellContent`). Getting the path
   wrong produces silent no-ops, not exceptions.
