The brand's surface primitive — warm-white surface, 1px calm border, 14px radius, low shadow. `interactive` lifts 2px on hover; `selected` adds a brand ring. No coloured left-borders, no gradient fills.

```jsx
<Card>…</Card>
<Card interactive onClick={pick}>…</Card>
<Card selected>…</Card>
```

Props: `interactive`, `selected`, `padding` (default `--space-5`).
