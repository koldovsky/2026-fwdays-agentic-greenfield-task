Pill for book tags and shelves (the home screen groups books by these).

```jsx
<Tag>#philosophy</Tag>
<Tag color="var(--hl-pink)" active>#re-read</Tag>
<Tag onRemove={() => drop(t)}>#fiction</Tag>
```

`active` fills blue; `color` adds a dot; `onRemove` shows ×.
