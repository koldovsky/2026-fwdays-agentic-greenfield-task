iOS toggle switch. Amber track when on, soft fill when off.

```jsx
const [on, setOn] = React.useState(true);
<Switch checked={on} onChange={setOn} />
```

Controlled: pass `checked` and `onChange(next)`. `size` `sm | md`.
