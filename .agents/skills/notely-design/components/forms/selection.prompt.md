# Checkbox, Radio & Switch

Selection controls. All accept `checked`, `disabled`, `label`, `onChange`.

```jsx
<Checkbox checked={done} onChange={toggle} label="Mark complete" />
<Checkbox indeterminate label="Select all" />
<Radio name="sort" value="recent" checked label="Recent" />
<Switch checked={dark} onChange={toggle} label="Dark theme" />
```

- **Checkbox** — multi-select / checklist items; supports `indeterminate`.
- **Radio** — one of a set; share a `name`.
- **Switch** — instant on/off settings (no save needed). Checkbox uses Lucide `check`/`minus`.
