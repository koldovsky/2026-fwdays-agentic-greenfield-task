# Гривня — UI kit

The full **Гривня** app recreation: today's official NBU rates, a focused
currency, a UAH ⇄ foreign converter, and a 30-day rate-history chart — one
calm sheet, Ukrainian-first, no exclamation marks.

## Files
- `index.html` — entry point. Loads `styles.css`, Lucide, React, Recharts,
  the design-system bundle (`_ds_bundle.js`), `data.js`, then the screen
  parts, and mounts `window.HryvniaApp`.
- `data.js` — mock NBU data (`window.HryvniaData`): `asOf`, `rates` (each with a
  deterministic 30-day `history`), `trendHint(cur)`, `sayingOfDay()`.
- `Header.jsx` — logo lockup, `AsOfBadge` provenance, theme `Switch`.
- `RatesPanel.jsx` — `CurrencyPicker` (filter + list of `RateRow`s).
- `FocusHero.jsx` — the focused currency: big rate, weekly `TrendBadge`,
  one-sentence trend hint ("one number, then the detail").
- `DetailPanel.jsx` — `Tabs` between the `Converter` and the `RateChart`
  (30-day) with min / max / today stats.
- `Footer.jsx` — a dry deterministic one-liner + privacy/provenance note.
- `App.jsx` — orchestrates the two-column layout and focus state.

## Composition
Every visible primitive comes from the design-system bundle (`RateRow`,
`Converter`, `RateChart`, `CurrencyPicker`, `TrendBadge`, `AsOfBadge`,
`CurrencyAvatar`, `Tabs`, `Switch`, …) — the kit only arranges them and feeds
mock data. Replace `data.js` with the live keyless NBU API for production.

## Notes
- The bundle namespace is resolved at runtime (a small `window` scan), so the
  kit keeps working whatever hash the compiler assigns.
- `RateChart` needs the Recharts UMD global; `index.html` loads it (with
  `prop-types`) before the bundle.
