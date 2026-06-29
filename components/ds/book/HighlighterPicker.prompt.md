Pick a highlighter color when creating/editing a note. Maps to the `--hl-*` tokens.

```jsx
<HighlighterPicker value={color} onChange={setColor} />
```

Keys: `yellow amber coral pink purple blue teal green`. Map a key to its CSS var with `var(--hl-${key})`.
