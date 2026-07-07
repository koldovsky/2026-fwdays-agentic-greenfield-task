Transient, non-modal feedback surface for domain errors and command failures.

```jsx
<Toast tone="error" onDismiss={() => hide(id)}>
  Can't reach the TV. Check that it's on and on the same network.
</Toast>
```

Use for **transient** feedback that must appear without stealing focus:
command failure copy, "reconnected", "session dropped." Prefer `Modal`
when the user must act before continuing, and `Badge` for inline
long-lived status (device online/offline, session Connected/Connecting).

Tones map to status tokens (same vocabulary `Badge` uses):

| tone     | left band + icon color |
| -------- | ---------------------- |
| info     | `--connecting`         |
| warning  | `--connecting`         |
| error    | `--offline`            |

Copy stays English, sentence case, second person. Defaults to Material
Symbols glyphs `info` / `warning` / `error` per tone; override via `icon`.
Rendered inside a fixed `<ToastHost>` in the app root, not inline.
