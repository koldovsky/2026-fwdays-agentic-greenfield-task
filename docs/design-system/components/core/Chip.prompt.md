A compact, pill-shaped selector / token — for quick currency filters and removable selections. `active` fills with a green tint; `onRemove` adds a trailing ×.

```jsx
<Chip icon="star" active onClick={pick}>USD</Chip>
<Chip onRemove={() => drop('PLN')}>PLN</Chip>
```

Props: `icon`, `active`, `onClick`, `onRemove`.
