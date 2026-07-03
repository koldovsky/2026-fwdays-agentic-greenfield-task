iOS segmented control. Used for the theme switch (Light / Dark / System).

```jsx
const [theme, setTheme] = React.useState("Dark");
<SegmentedControl options={["Light","Dark","System"]} value={theme} onChange={setTheme} />
```

Options can be plain strings or `{value,label}` objects.
