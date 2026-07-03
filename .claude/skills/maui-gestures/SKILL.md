---
name: maui-gestures
description: >
  Guidance for implementing tap, swipe, pan, pinch, drag-and-drop, and pointer
  gesture recognizers in .NET MAUI applications. Covers XAML and C# usage,
  combining gestures, and platform differences.
  USE FOR: "tap gesture", "swipe gesture", "pan gesture", "pinch gesture",
  "drag and drop", "pointer gesture", "gesture recognizer", "TapGestureRecognizer",
  "SwipeGestureRecognizer", "PanGestureRecognizer", "combine gestures".
  DO NOT USE FOR: animations triggered by gestures (use maui-animations),
  CollectionView swipe actions (use maui-collectionview), or custom drawing interaction (use maui-graphics-drawing).
---

# .NET MAUI Gesture Recognizers

## Deprecated API Warning

> ⚠️ In .NET 10, `ClickGestureRecognizer` is **deprecated**. Use
> `TapGestureRecognizer` (touch/stylus) and `PointerGestureRecognizer`
> (mouse hover/press) instead.

---

## Common Mistakes

### One `SwipeGestureRecognizer` per direction

A single recognizer handles only one direction. Adding multiple directions to
one recognizer silently fails on most platforms.

```xml
<!-- ❌ Only fires for Left — Right is ignored -->
<SwipeGestureRecognizer Direction="Left,Right" Swiped="OnSwiped" />

<!-- ✅ Separate recognizer per direction -->
<SwipeGestureRecognizer Direction="Left" Swiped="OnSwiped" />
<SwipeGestureRecognizer Direction="Right" Swiped="OnSwiped" />
```

### `AllowDrop` defaults to `false`

Drop targets silently ignore drops if you forget this property.

```xml
<!-- ❌ Drop never fires — AllowDrop defaults to false -->
<StackLayout>
  <StackLayout.GestureRecognizers>
    <DropGestureRecognizer Drop="OnDrop" />
  </StackLayout.GestureRecognizers>
</StackLayout>

<!-- ✅ Explicitly enable drops -->
<StackLayout>
  <StackLayout.GestureRecognizers>
    <DropGestureRecognizer AllowDrop="True" Drop="OnDrop" />
  </StackLayout.GestureRecognizers>
</StackLayout>
```

### Using `TapGestureRecognizer` for hover effects

Tap recognizers don't track pointer movement. Use `PointerGestureRecognizer`
for hover effects — it also enables the `PointerOver` visual state.

```xml
<!-- ❌ No hover tracking — user must tap to trigger -->
<Border>
  <Border.GestureRecognizers>
    <TapGestureRecognizer Command="{Binding HoverCommand}" />
  </Border.GestureRecognizers>
</Border>

<!-- ✅ Proper hover detection + visual state -->
<Border>
  <Border.GestureRecognizers>
    <PointerGestureRecognizer PointerEnteredCommand="{Binding HoverInCommand}"
                              PointerExitedCommand="{Binding HoverOutCommand}" />
  </Border.GestureRecognizers>
</Border>
```

---

## Platform Differences That Bite

### Pan delta coordinates differ by platform

| Platform | `TotalX` / `TotalY` relative to |
|---|---|
| iOS / Mac Catalyst | Start of gesture |
| Android | **Previous event** (not start!) |
| Windows | Start of gesture |

If sub-pixel accuracy matters, normalize Android deltas by accumulating them
manually rather than using `TotalX`/`TotalY` directly.

### Pointer hover is mouse/trackpad only

On touch devices, `PointerGestureRecognizer` events fire on press/release
but **hover is not tracked** between touches. Don't rely on `PointerMoved`
for touch-based UI.

### Cross-app drag-and-drop

| Platform | Supported |
|---|---|
| iPadOS / Mac Catalyst | ✅ Yes |
| Windows | ✅ Yes |
| Android | ❌ No |

### Secondary button (right-click)

| Platform | Behaviour |
|---|---|
| iOS / Mac Catalyst | `Buttons = ButtonsMask.Secondary` works |
| Windows | `Buttons = ButtonsMask.Secondary` works |
| Android | Falls back to long-press — no true right-click |

---

## Gesture Combination Conflicts

Combining pan + swipe on the same view **conflicts on Android** — the swipe
may consume the gesture before pan starts. Test on all platforms, or use
only one at a time.

Combining tap + pan works well — tap fires on quick taps, pan fires on
sustained drags.

---

## MVVM Best Practice

Prefer **commands** over events for testable view models. Both work
identically at runtime, but commands are easier to mock and test.

```xml
<!-- ✅ Bindable command — testable -->
<TapGestureRecognizer Command="{Binding TapCommand}" />

<!-- ⚠️ Event handler — requires code-behind, harder to unit-test -->
<TapGestureRecognizer Tapped="OnTapped" />
```

---

## Quick Rules

1. One `SwipeGestureRecognizer` per direction
2. `PointerGestureRecognizer` for hover, not `TapGestureRecognizer`
3. `AllowDrop="True"` on drop targets — it defaults to `false`
4. Normalize pan deltas on Android (relative to previous event, not start)
5. Prefer commands over events for MVVM
6. Use `TapGestureRecognizer` instead of deprecated `ClickGestureRecognizer` (.NET 10)
7. Don't rely on `PointerMoved` for touch-based UI — hover doesn't track