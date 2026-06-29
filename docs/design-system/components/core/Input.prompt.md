Single-line text field on paper. Use for search, titles, author, page numbers.

```jsx
<Input label="Title" placeholder="Book title…" />
<Input iconLeft={<Search size={15} />} placeholder="Search your shelf" />
<Input label="Pages" error="Must be a number" defaultValue="abc" />
```

Props: `label`, `hint`, `error` (reddens border + replaces hint), `iconLeft`, `size` (`sm | md`). Spreads native input props.
