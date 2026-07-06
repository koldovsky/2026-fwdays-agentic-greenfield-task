## Context

Visual restyle of the landing page to a centered hero with an inline entry row,
matching a provided mock. Only the landing capability is touched.

## Goals / Non-Goals

**Goals:** centered three-tier hero; inline input + arrow action; friendlier
Explore/Compare mode labels; no change to validation/navigation behavior.

**Non-Goals:** re-theming the stats/battle views; changing the `/battle` routes or
the head-to-head "battle" identity; touching the data layer.

## Decisions

- **Copy moves to `lib/strings.ts`** — new `landing.eyebrow/headline/sub`, and
  `modeStats`/`modeBattle`/`fightAction` re-worded to Explore/Compare. Keeps
  NFR-I18N-01 (one string module).
- **Inline entry row.** Explore mode: `[input (flex-1)] [submit]`. Compare mode:
  two inputs stacked over a full-width submit (two inline inputs would crowd at
  mobile width). Submit is the `primary` button variant — light fill in dark mode,
  matching the mock — with a trailing "→" text glyph (near-iconless, BC-BRAND-03).
- **Accessible inputs without visible labels.** The mock shows no field labels, so
  labels become `sr-only`/`aria-label` to preserve accessible names (NFR-A11Y-01).
- **Active tab text uses `text-bg`.** Dark text on the terracotta tab in dark mode
  (matches the mock) and light text in light mode — both meet AA (NFR-A11Y-02).

## Risks / Trade-offs

- [Landing says "Compare" but the app is "GitHub Battle"] → Accepted: the entry
  screen stays calm; the head-to-head result view keeps its battle voice. Easy to
  revert via `lib/strings.ts` if the product prefers "Battle".
