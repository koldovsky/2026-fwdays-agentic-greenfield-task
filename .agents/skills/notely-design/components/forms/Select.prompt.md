# Select

Dropdown for sort/filter and settings. Native-backed for full keyboard + screen-reader support.

```jsx
<Select label="Sort by" value={sort} onChange={e=>setSort(e.target.value)}
  options={[{value:"recent",label:"Recently edited"},{value:"created",label:"Date created"},{value:"title",label:"Title A–Z"}]} />
```

Uses Lucide `chevron-down`.
