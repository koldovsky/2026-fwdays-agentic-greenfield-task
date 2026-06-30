Single-line text field — sunken surface, calm focus ring. Set `mono` for amount entry (tabular figures); `suffix` adds a trailing unit; `align="right"` for ledger-style numbers.

```jsx
<Input icon="search" placeholder="Знайдіть валюту" size="lg" />
<Input mono align="right" suffix="₴" value={amount} onChange={e => setAmount(e.target.value)} />
```

Props: `icon`, `size` (`md`/`lg`), `loading`, `mono`, `align`, `suffix`, `disabled`.
