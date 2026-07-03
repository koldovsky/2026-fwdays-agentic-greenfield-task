---
name: maui-animations
description: >
  .NET MAUI view animations, custom animations, easing functions,
  rotation, scale, translation, and fade effects.
  USE FOR: "animate view", "fade in", "fade out", "slide animation", "scale animation",
  "rotate view", "translate view", "easing function", "custom animation", "animation chaining",
  "ViewExtensions animation".
  DO NOT USE FOR: gesture recognition (use maui-gestures), custom drawing (use maui-graphics-drawing),
  or static layout changes (use maui-data-binding).
---

# .NET MAUI Animations

## Common Mistakes

### ❌ Forgetting to cancel before starting new animations

Running multiple animations on the same property causes visual glitches.

```csharp
// ❌ If called rapidly, animations queue and overlap
async void OnButtonClicked()
{
    await view.FadeTo(0, 500);
    await view.FadeTo(1, 500);
}

// ✅ Cancel first, then animate
async void OnButtonClicked()
{
    view.CancelAnimations();
    await view.FadeTo(0, 500);
    await view.FadeTo(1, 500);
}
```

### ❌ Custom Animation repeat callback misconception

Returning `true` from a **child** animation's `repeat` callback does NOT repeat the parent. Only the `repeat` callback passed to `Commit` on the **parent** controls parent repetition.

```csharp
// ❌ This does NOT loop the parent animation
parent.Add(0.0, 1.0, new Animation(v => view.Scale = v, 1, 2));
parent.Commit(view, "MyAnim", length: 1000,
    repeat: () => false);  // Parent won't loop

// ✅ Loop the parent by passing repeat to Commit
parent.Commit(view, "MyAnim", length: 1000,
    repeat: () => true);  // This loops the entire animation
```

### ❌ AbortAnimation name mismatch

`AbortAnimation("name")` must match the exact string passed to `Commit`. A mismatch silently does nothing.

```csharp
// ❌ Name mismatch — animation keeps running
parent.Commit(view, name: "MyAnimation", length: 1000);
view.AbortAnimation("myAnimation");  // Wrong case!

// ✅ Use a constant for the name
const string AnimName = "MyAnimation";
parent.Commit(view, name: AnimName, length: 1000);
view.AbortAnimation(AnimName);
```

## Accessibility: Respect Reduced Motion

**Always** check `IsAnimationEnabled` before running animations. It is `false` when the OS power-save / reduced-motion mode is active.

```csharp
// ❌ Ignores user's accessibility preference
await view.FadeTo(1, 500);

// ✅ Respects reduced-motion settings
if (view.IsAnimationEnabled)
    await view.FadeTo(1, 500);
else
    view.Opacity = 1;  // Jump to final state instantly
```

## Performance Tips

- **Keep animation callbacks under 16ms** — the default `rate: 16` in `Commit` is one frame at 60fps. Complex callbacks cause jank.
- **Avoid animating layout-triggering properties** (`WidthRequest`, `HeightRequest`) — use `TranslationX/Y` and `Scale` instead.
- **Use `Task.WhenAll` for parallel animations** — sequential `await` chains are slower.

```csharp
// ❌ Sequential — takes 1500ms total
await view.FadeTo(1, 500);
await view.ScaleTo(1.5, 500);
await view.RotateTo(360, 500);

// ✅ Parallel — takes 500ms total
await Task.WhenAll(
    view.FadeTo(1, 500),
    view.ScaleTo(1.5, 500),
    view.RotateTo(360, 500));
```

## Easing Selection Guide

| Goal | Easing | Why |
|------|--------|-----|
| Button feedback | `CubicOut` | Quick deceleration feels responsive |
| Page transitions | `CubicInOut` | Smooth start and end |
| Bouncing elements | `BounceOut` | Playful, attention-grabbing |
| Spring effects | `SpringOut` | Natural, elastic feel |
| Loading indicators | `Linear` | Constant speed for continuous motion |
| Entry/exit | `SinIn` / `SinOut` | Subtle, non-distracting |
