iOS bottom tab bar — Timer, Stats, Profile. Blurred material; active tab amber.

```jsx
<TabBar value={tab} onChange={setTab} items={[
  { value:"timer",   label:"Timer",   icon:<i data-lucide="timer"/> },
  { value:"stats",   label:"Stats",   icon:<i data-lucide="bar-chart-2"/> },
  { value:"profile", label:"Profile", icon:<i data-lucide="user"/> },
]} />
```

Pin to the bottom of a fixed-height phone frame.
