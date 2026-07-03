---
name: maui-safe-area
description: >
  .NET MAUI safe area and edge-to-edge layout guidance for .NET 10+. Covers
  SafeAreaEdges property, SafeAreaRegions enum, per-edge control, keyboard
  avoidance, Blazor Hybrid CSS safe areas, migration from legacy APIs, and
  platform-specific behavior for Android, iOS, and Mac Catalyst.
  USE FOR: "safe area", "edge-to-edge", "SafeAreaEdges", "SafeAreaRegions",
  "keyboard avoidance", "notch insets", "status bar overlap", "iOS safe area",
  "Android edge-to-edge", "content behind status bar".
  DO NOT USE FOR: general layout or grid design (use maui-collectionview),
  app lifecycle handling (use maui-app-lifecycle), or theming (use maui-theming).
---

# Safe Area — Gotchas & Best Practices (.NET 10+)

## Breaking Changes

### ⚠️ .NET 9 → 10: ContentPage default changed to `None`

`ContentPage` now defaults to edge-to-edge (`None`) on **all platforms**. In .NET 9,
Android `ContentPage` behaved like `Container`. If your Android content goes under
the status bar after upgrading, add `SafeAreaEdges="Container"` explicitly.

```xaml
<!-- ❌ .NET 10 default — content goes under status bar on Android -->
<ContentPage>

<!-- ✅ Restore .NET 9 Android behavior -->
<ContentPage SafeAreaEdges="Container">
```

### ⚠️ WindowSoftInputModeAdjust.Resize migration

If you used `WindowSoftInputModeAdjust.Resize` in .NET 9, you may need
`SafeAreaEdges="All"` on the ContentPage to maintain keyboard avoidance.

## Common Gotchas

### 1. Layouts default to `Container`, not `None`

For true edge-to-edge, set `SafeAreaEdges="None"` on **both** the page and layouts:

```xaml
<!-- ❌ Grid still respects system bars (its default is Container) -->
<ContentPage SafeAreaEdges="None">
    <Grid>
        <Image Source="bg.jpg" Aspect="AspectFill" />
    </Grid>
</ContentPage>

<!-- ✅ Both page and layout set to None -->
<ContentPage SafeAreaEdges="None">
    <Grid SafeAreaEdges="None">
        <Image Source="bg.jpg" Aspect="AspectFill" />
    </Grid>
</ContentPage>
```

### 2. `SoftInput` on ScrollView has no effect

ScrollView manages its own content insets. Wrap it in a Grid/StackLayout instead:

```xaml
<!-- ❌ SoftInput is ignored on ScrollView -->
<ScrollView SafeAreaEdges="SoftInput">

<!-- ✅ Set SoftInput on the wrapper layout -->
<Grid SafeAreaEdges="Container, Container, Container, SoftInput">
    <ScrollView> ... </ScrollView>
</Grid>
```

### 3. `Default` is not `None`

`Default` = "use platform defaults for this control type." `None` = "edge-to-edge."
They differ significantly on ScrollView (iOS maps `Default` to automatic content insets).

### 4. Blazor Hybrid double-padding

```xaml
<!-- ❌ XAML safe area + CSS env() = double padding -->
<ContentPage SafeAreaEdges="Container">
    <BlazorWebView ... />  <!-- CSS also uses env(safe-area-inset-*) -->

<!-- ✅ Pick ONE approach — CSS is recommended for Blazor -->
<ContentPage SafeAreaEdges="None">
    <BlazorWebView ... />  <!-- CSS handles all insets with env() -->
```

### 5. iOS Shell/NavigationPage edge-to-edge

Content won't extend behind the nav bar unless you set a transparent background AND hide the separator:

```xaml
<Shell Shell.BackgroundColor="#80000000"
       Shell.NavBarHasShadow="False" />
```

## Decision Framework

| Scenario | SafeAreaEdges value |
|---|---|
| Forms, critical inputs | `All` |
| Photo viewer, video player, game | `None` (on page AND layout) |
| Scrollable content with fixed header/footer | `Container` |
| Chat/messaging with bottom input bar | Per-edge: `Container, Container, Container, SoftInput` |
| Blazor Hybrid app | `None` on page, CSS `env()` for insets |

## Migration Quick Reference

| Legacy (.NET 9) | New (.NET 10+) |
|---|---|
| `ios:Page.UseSafeArea="True"` | `SafeAreaEdges="Container"` |
| `IgnoreSafeArea="True"` | `SafeAreaEdges="None"` |
| `WindowSoftInputModeAdjust.Resize` | `SafeAreaEdges="All"` on ContentPage |

Legacy properties still work but are obsolete.

## Best Practices

1. **Combine `SafeAreaEdges` with `Padding`** — safe area handles insets, `Padding` adds visual spacing:

   ```xaml
   <ContentPage SafeAreaEdges="All">
       <VerticalStackLayout Padding="20">
           <!-- Both applied — no conflict -->
       </VerticalStackLayout>
   </ContentPage>
   ```

2. **Use per-control settings** for mixed layouts (edge-to-edge header + safe body + keyboard-aware footer).

3. **For Blazor Hybrid**, prefer CSS `env()` and leave `SafeAreaEdges="None"`.
   Add `viewport-fit=cover` to the `<meta viewport>` tag.

4. **Test on notched devices** (iPhone X+, Android cutouts), tablets in landscape, and varying screen sizes.

## Checklist

- [ ] Android upgrade: `SafeAreaEdges="Container"` added if content goes under status bar
- [ ] Edge-to-edge: `None` set on **both** page and layout
- [ ] ScrollView keyboard avoidance uses wrapper Grid, not ScrollView's own `SafeAreaEdges`
- [ ] Blazor Hybrid: using either XAML or CSS safe areas, not both
- [ ] `viewport-fit=cover` in Blazor's `index.html` `<meta viewport>` tag
- [ ] Legacy `UseSafeArea` / `IgnoreSafeArea` migrated to `SafeAreaEdges`
