# ADR-0004: Recharts delivered via npm import, not the vendored UMD global

- **Status:** Accepted
- **Date:** 2026-06-30
- **Deciders:** orchestrator + user

## Context

[ADR-0001](ADR-0001-stack.md) locked "Recharts for the history chart (UMD
global, graceful degrade)" — following the vendored design system's
`RateChart.jsx`, which reads `window.Recharts` and renders a calm "Recharts
not loaded" fallback when the global is absent ([DESIGN.md](../../DESIGN.md)
documents this as a deferred-loading pattern). That design was written for
the vendored kit's own static-HTML prototyping context
(`docs/design-system/SKILL.md`: "create static HTML files" for prototypes vs.
"production code" — the UMD pattern fits the former).

Building the `rate-history` slice (FR-HISTORY-01: an actual line chart must
render, not just be designed) surfaces a problem with carrying that pattern
into production: Recharts' own UMD bundle does not embed React — it expects
`window.React` and `window.ReactDOM` as externals, since Recharts is a React
component library, not a standalone chart engine. To make `window.Recharts`
usable at all, the app would also need to load UMD React + ReactDOM as global
scripts, **separate from** the React/ReactDOM that Next.js already bundles
and uses to render the whole page. `RateChart.jsx`'s own JSX (`<AreaChart>`,
`<Area>`, …) would then be reconciled by **Next's** React while those
components' internal hooks run against the **UMD** `window.React` — two
React copies touching the same component subtree, the classic root cause of
"Invalid hook call" / context-bridging failures. This is fragile, adds
~130KB+ of duplicate React/ReactDOM/Recharts script weight, and risks
shipping a chart that intermittently breaks rather than one that reliably
satisfies FR-HISTORY-01.

## Decision

We will add **`recharts` as a real npm dependency** and import its
components normally (`import { AreaChart, Area, … } from "recharts"`) inside
a new `components/rates/HistoryChart.tsx`, rendered by Next's own bundled
React — no UMD script, no `window.Recharts` lookup, no risk of a duplicate
React instance. `HistoryChart.tsx` **replicates the vendored `RateChart.jsx`'s
visual design** (brand-coloured area with a soft gradient wash, calm grid,
mono tabular axis ticks and tooltip, padded y-domain per FR-HISTORY-04) so
the brand decision recorded in DESIGN.md is honoured — only the *delivery
mechanism* changes, not the chosen library (`TC-CHART-01` — "Recharts" —
still holds) or the look.

The vendored `docs/design-system/components/rates/RateChart.jsx` and its live
copy `components/ds/rates/RateChart.jsx` are left as-is (read-only upstream /
prototyping reference respectively) — they remain correct for their original
static-HTML prototyping use case and are simply not used by the production app.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| npm import (chosen) | Standard, well-trodden Next.js pattern; no dual-React risk; tree-shaken, no extra script tags | One new runtime dependency (`recharts`) |
| Wire `window.React`/`ReactDOM`/`Recharts` via `<Script>` as originally planned | Matches ADR-0001 literally; reuses `RateChart.jsx` verbatim | Real risk of invalid-hook-call/context bugs from two React copies in one tree; ~130KB+ of duplicated React/ReactDOM/Recharts; harder to debug under a course deadline |
| Drop the chart, ship only the fallback text | Zero risk, zero new dependency | Violates FR-HISTORY-01 outright — not an option |

## Consequences

- **Easier:** the chart is a normal, reliable React component; no script-load
  ordering or global-availability race conditions to reason about.
- **We accept:** one new npm dependency (`recharts`) and a small bundle-size
  increase, scoped to the page that renders it.
- **Supersedes:** the "UMD global" clause of `TC-CHART-01` in
  [ADR-0001](ADR-0001-stack.md) — the library choice (Recharts) is unchanged;
  only "UMD global" is replaced by "npm import." `docs/requirements.md`'s
  `TC-CHART-01` description should be read as amended accordingly.
- **Follow-ups:** none blocking. If a future slice ever needs another vendored
  DS component that assumes the UMD/static-prototype delivery model, apply
  the same test: does it need to *actually run reliably in production*, or is
  it prototype-only? Production-bound components get a real import.
