---
name: frontend-design-skill
description: Use when writing any UI code, React components, or styles for Pokédex Explorer — enforces design system conventions and screen reference usage
---

# Frontend Design — Pokédex Explorer

Read `DESIGN.md` before writing any UI code — it is the brand contract.

All DS components live in `src/components/ds/`; import from `@/components/ds`.

No raw hex colors or px values in source — use DS tokens via `var()`.

## Screen reference implementations

Reference implementations for all screens live in `docs/ui-kit-reference/`:

| File | Covers |
|---|---|
| `AppShell.jsx` | Top bar, main content area, footer layout |
| `ListScreen.jsx` | Pokémon grid with filter bar |
| `FilterBar.jsx` | Search + type / generation / legendary filters |
| `DetailScreen.jsx` | Full Pokémon detail page |
| `icons.jsx` | Inline Lucide icon paths used by the kit |

Read the relevant file before implementing any screen or layout component. These are the exact intended layouts — match their structure and DS class usage.
