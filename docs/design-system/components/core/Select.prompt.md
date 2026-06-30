A calm native dropdown wrapped to match the brand — sunken surface, optional leading icon, chevron affordance.

```jsx
<Select icon="coins" value={cur} onChange={e => setCur(e.target.value)}
  options={[{value:'USD',label:'Долар США'},{value:'EUR',label:'Євро'}]} />
```

Props: `options` (strings or `{value,label}`), `icon`, `size` (`md`/`lg`), `disabled`.
