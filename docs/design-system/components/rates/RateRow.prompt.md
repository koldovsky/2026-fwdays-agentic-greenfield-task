One currency line in the rates list — leads with the official UAH rate in tabular mono, then the day-over-day move. Composes `CurrencyAvatar` + `TrendBadge`.

```jsx
<RateRow code="USD" name="Долар США" rate={41.85} delta={0.1} interactive onClick={pick} />
<RateRow code="EUR" name="Євро" rate={45.12} delta={-0.3} selected />
```

Props: `code`, `name`, `flag`, `rate`, `unit` (quote units, default 1), `delta` (%), `selected`, `interactive`, `onClick`.
