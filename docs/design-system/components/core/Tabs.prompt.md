A segmented pill control for switching views — brand-filled active segment, calm, no bounce.

```jsx
<Tabs value={view} onChange={setView}
  tabs={[{value:'rates',label:'Курси'},{value:'convert',label:'Конвертер'},{value:'history',label:'Історія'}]} />
```

Props: `tabs` (`{value,label}[]`), `value`, `onChange`, `size` (`sm`/`md`).
