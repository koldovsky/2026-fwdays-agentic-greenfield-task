The default container — list rows, template cards, reviewer rows, dialogs.

```jsx
<Card style={{ padding: 16 }}>…</Card>
<Card interactive onClick={open} style={{ padding: 12 }}>…</Card>
<Card selected style={{ padding: 14 }}>…</Card>
```

White fill, 1px `--line-soft` border, 8px radius, **no shadow** (shadows are for dialogs/toasts only). `interactive` adds the `#F7F6F2` hover; `selected` is the 2px-green + `--green-tint-1` treatment used for chosen templates/options.
