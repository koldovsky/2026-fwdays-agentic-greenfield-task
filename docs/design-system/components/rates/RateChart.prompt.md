A calm ~30-day line of one currency's official UAH rate, so the trend is visible at a glance. Built on Recharts (load the Recharts UMD global first). The y-domain is padded around the data so small moves read honestly, not dramatised.

```jsx
<RateChart data={[{label:'12.06',rate:41.4},{label:'13.06',rate:41.5}, /* … */]} />
```

Props: `data` (`{label,rate}[]`, oldest first), `height` (default 240), `color`.
