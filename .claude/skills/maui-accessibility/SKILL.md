---
name: maui-accessibility
description: >
  Guide for making .NET MAUI apps accessible — screen reader support via SemanticProperties,
  heading levels, AutomationProperties visibility control, programmatic focus and announcements,
  and platform-specific gotchas for TalkBack, VoiceOver, and Narrator.
  USE FOR: "add accessibility", "screen reader support", "SemanticProperties", "AutomationProperties",
  "TalkBack", "VoiceOver", "Narrator", "accessible MAUI", "heading levels", "semantic description",
  "announce to screen reader", "accessibility audit".
  DO NOT USE FOR: general UI layout (use maui-collectionview or maui-shell-navigation),
  animations (use maui-animations), or gestures (use maui-gestures).
---

# .NET MAUI Accessibility

## Critical Platform Gotchas

### 1. Don't set Description on Label

Setting `SemanticProperties.Description` on a `Label` **overrides** the `Text`
property for screen readers. The label may be read twice or behave unexpectedly.

```xml
<!-- ❌ Stops Text from being read naturally -->
<Label Text="Welcome"
       SemanticProperties.Description="Welcome" />

<!-- ✅ Screen reader reads Text automatically -->
<Label Text="Welcome" />
```

### 2. Android Entry/Editor: Description breaks TalkBack actions

On Android, setting `SemanticProperties.Description` on `Entry` or `Editor`
causes TalkBack to lose "double tap to edit" action hints.

```xml
<!-- ❌ Breaks TalkBack on Android -->
<Entry SemanticProperties.Description="Email address" />

<!-- ✅ Use Placeholder for context instead -->
<Entry Placeholder="Email address" />
```

### 3. iOS: Description on parent hides children

On iOS/VoiceOver, setting `SemanticProperties.Description` on a layout makes the
entire container a single accessible element — child elements become **unreachable**.

```xml
<!-- ❌ Children invisible to VoiceOver -->
<HorizontalStackLayout SemanticProperties.Description="User info">
    <Label Text="Name:" />
    <Label Text="Alice" />
</HorizontalStackLayout>

<!-- ✅ Let children be individually focusable -->
<HorizontalStackLayout>
    <Label Text="Name:" />
    <Label Text="Alice" />
</HorizontalStackLayout>
```

### 4. Hint conflicts with Entry.Placeholder on Android

On Android, `SemanticProperties.Hint` and `Entry.Placeholder` map to the same
Android attribute (`contentDescription` / `hint`). Setting both causes one to
override the other. **Choose one.**

### 5. HeadingLevel platform differences

- **Windows (Narrator):** Supports all 9 heading levels (`Level1`–`Level9`).
- **Android (TalkBack) / iOS (VoiceOver):** Only distinguish "heading" vs
  "not heading". All levels are treated identically.

Use heading levels for semantic correctness — just know the hierarchy only renders on Windows.

## Accessibility Checklist

When auditing or retrofitting a page:

1. **Images**: Add `SemanticProperties.Description` to meaningful images.
   Set `AutomationProperties.IsInAccessibleTree="false"` on decorative ones.
2. **Buttons/Controls**: Ensure icon-only buttons have `Description`.
   Text buttons generally don't need it.
3. **Entries/Editors**: Use `Placeholder` for context. Add `Hint` only if
   extra instruction is needed. **Avoid `Description`** (Android breakage).
4. **Labels**: Do **not** add `Description` — let `Text` speak for itself.
   Add `HeadingLevel` to section headers.
5. **Headings**: Mark page title as `Level1`, section titles as `Level2`, etc.
6. **Grouping**: Avoid `Description` on layout containers (iOS breakage).
   Use `ExcludedWithChildren` to hide decorative groups.
7. **Dynamic content**: Call `SemanticScreenReader.Announce` for status
   changes. Use `SetSemanticFocus` after navigation or error display.
8. **Tab order**: Set `TabIndex` on interactive controls for logical order.
9. **Test**: Run TalkBack (Android), VoiceOver (iOS/Mac), and Narrator
   (Windows) to verify reading order and actions.
