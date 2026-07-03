# Accessibility API Reference

## SemanticProperties (Attached Properties)

Set on any `VisualElement` to provide screen reader context.

| Property | Purpose |
|---|---|
| `SemanticProperties.Description` | Accessible name read by screen reader |
| `SemanticProperties.Hint` | Extra context (e.g. "Double tap to activate") |
| `SemanticProperties.HeadingLevel` | Heading landmark: `None`, `Level1`–`Level9` |

### XAML

```xml
<Button Text="Save"
        SemanticProperties.Description="Save your changes"
        SemanticProperties.Hint="Double tap to save the current document" />

<Label Text="Settings"
       SemanticProperties.HeadingLevel="Level1" />
```

### C#

```csharp
var btn = new Button { Text = "Save" };
SemanticProperties.SetDescription(btn, "Save your changes");
SemanticProperties.SetHint(btn, "Double tap to save the current document");

var heading = new Label { Text = "Settings" };
SemanticProperties.SetHeadingLevel(heading, SemanticHeadingLevel.Level1);
```

## Programmatic Focus & Announcements

### SetSemanticFocus

Move screen reader focus to an element after a UI change:

```csharp
errorLabel.Text = "Username is required";
errorLabel.SetSemanticFocus();
```

### SemanticScreenReader.Announce

Push a live announcement without moving focus:

```csharp
SemanticScreenReader.Announce("File uploaded successfully");
```

Use `Announce` for transient status updates. Use `SetSemanticFocus` when the user
must interact with the target element.

## AutomationProperties

Control whether an element appears in the accessibility tree.

| Property | Effect |
|---|---|
| `AutomationProperties.IsInAccessibleTree` | `false` hides the element from screen readers |
| `AutomationProperties.ExcludedWithChildren` | `true` hides the element **and all descendants** |

```xml
<!-- Decorative image — hide from screen reader -->
<Image Source="bg.png"
       AutomationProperties.IsInAccessibleTree="false" />

<!-- Container with purely decorative content -->
<Grid AutomationProperties.ExcludedWithChildren="true">
    <Image Source="pattern.png" />
</Grid>
```

### Deprecated AutomationProperties → SemanticProperties

| Deprecated | Replacement |
|---|---|
| `AutomationProperties.Name` | `SemanticProperties.Description` |
| `AutomationProperties.HelpText` | `SemanticProperties.Hint` |

Avoid the deprecated properties in new code. They may not work consistently
across platforms and will be removed in a future release.
