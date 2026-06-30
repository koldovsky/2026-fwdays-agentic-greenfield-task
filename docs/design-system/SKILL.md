---
name: hryvnia-design
description: Use this skill to generate well-branded interfaces and assets for «Гривня» (Hryvnia) — a calm, Ukrainian-first app for the official NBU exchange rate — either for production or throwaway prototypes/mocks. Contains design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy
assets out and create static HTML files for the user to view. If working on
production code, you can copy assets and read the rules here to become an expert
in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation
- **Brand:** Гривня (Hryvnia) — the official UAH exchange rate, read calmly.
  Ukrainian-first, no exclamation marks. Lead with the rate (big, tabular mono),
  then one calm sentence on the move.
- **Global CSS:** link `styles.css` — it `@import`s every token. Consume
  semantic aliases (`--brand`, `--accent`, `--text`, `--surface`, `--border`,
  `--trend-up-*` / `--trend-down-*` / `--trend-flat-*`…), not raw ramps.
- **Type:** IBM Plex Serif (display) + IBM Plex Sans (UI/body) + IBM Plex Mono
  (all numerics, tabular). Full Cyrillic. Loaded from Google Fonts in
  `tokens/fonts.css`.
- **Icons:** Lucide via CDN at 1.75 stroke. The only sanctioned emoji is a
  country flag on a currency avatar / row.
- **Components:** resolve `window.<…DesignSystem_hash>` after loading
  `_ds_bundle.js` (scan `window` for the global). Core (Button, IconButton,
  Input, Select, Switch, Tabs, Badge, Card, Chip, Icon) + rates (TrendBadge +
  `trendTone`, CurrencyAvatar, AsOfBadge, RateRow, Converter, RateChart,
  CurrencyPicker).
- **Full app reference:** `ui_kits/hryvnia/`.

## Foundations
- Palette "Ledger": treasury-green brand, muted brass accent, warm paper
  neutrals. Trend = green up / clay down / warm-grey flat, muted never neon.
- Light + dark (`[data-theme="dark"]`), WCAG AA. Soft warm shadows; 10/14/18px
  radii; pill chips & trend badges. Gentle motion, nothing bounces, always
  respect `prefers-reduced-motion`. Always-visible focus rings. No exclamation
  marks; honest "stale rate" labelling on weekends/holidays.
