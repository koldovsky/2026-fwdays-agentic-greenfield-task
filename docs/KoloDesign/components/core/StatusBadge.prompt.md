Status pill that carries the Kolo360 status→color mapping so callers never hand-pick fills.

```jsx
<StatusBadge status="collecting" />
<StatusBadge status="done" />
<StatusBadge status="declined" />
```

- Green tints = positive/terminal (`done`, `approved`, `responded`). Amber = in-progress (`collecting`). Red = `declined`. Neutral grey = `draft`/`sent`/`pending`.
- Lower-case single words, `--text-sm`, medium weight, 6px radius. Never use a saturated color or an icon inside the pill.
