# SearchField

Search input used in the top bar and command palette. Shows a clear button when filled, a shortcut hint when empty.

```jsx
<SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ("")} shortcut="⌘K" />
```

Requires Lucide icons on the page (uses `search`, `x`).
