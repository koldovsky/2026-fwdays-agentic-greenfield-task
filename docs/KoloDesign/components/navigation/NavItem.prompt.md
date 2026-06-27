A row in the 220px sidebar (Cycles, Templates).

```jsx
<NavItem icon={<ClockIcon/>} active onClick={goCycles}>Cycles</NavItem>
<NavItem icon={<FileIcon/>} onClick={goTemplates}>Templates</NavItem>
```

Active = `--green-tint-3` fill + `--green` text + medium weight. Inactive = transparent + muted. Icon is a 16px Lucide stroke inheriting `currentColor`.
