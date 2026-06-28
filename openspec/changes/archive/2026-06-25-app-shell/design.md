## Context

The repository ships the Next.js 16 App Router starter: `app/layout.tsx` already
wires fonts (Onest + JetBrains Mono via `next/font`), the `uk`/`light` locale and
theme on `<html>`, and the design-system tokens through `app/globals.css`. But
`app/page.tsx` is still the `create-next-app` placeholder. The design system is
fully wired (semantic Tailwind utilities like `bg-surface`, `text-brand`,
`rounded-lg`, `shadow-md`) and the brand assets exist at
`public/brand/logo-mark.svg` and `logo-wordmark.svg`.

This change builds the shell that every other capability mounts into. It is the
first capability in the implementation order, so it also sets the conventions
(component location, i18n strings file, slot pattern) the rest of the app
inherits. Requirements: FR-SHELL-01/02/03, constrained by NFR-A11Y-01/02,
NFR-I18N-01, BC-BRAND-01, and the design system in `DESIGN.md`.

## Goals / Non-Goals

**Goals:**

- A responsive shell: top bar (logo/wordmark + theme indicator), main content
  area, footer, with 768/1280 px breakpoints (FR-SHELL-01, FR-SHELL-02).
- A first-load hero/empty state with a centered city-search slot (FR-SHELL-03).
- Named, empty slots/regions for the header clock, search, forecast, and footer
  so later capabilities drop in without re-layout.
- Establish the i18n string convention (`lib/i18n/uk.ts` + `en.ts`).
- Accessibility baseline: landmarks, visible focus rings, AA contrast, reduced
  motion (NFR-A11Y-01/02).

**Non-Goals:**

- No data fetching, geocoding, or forecast logic (later capabilities).
- No working theme toggle UI — only a static indicator of the current theme
  (toggle is explicitly deferred per `DESIGN.md`).
- No actual clock, search, joke, or forecast behavior — those are placeholder
  slots filled by `top-clock`, `city-search`, `bottom-jokes`, `forecast`.
- No new dependencies.

## Decisions

**Slot pattern over premature components.** The shell defines layout regions and
passes children/placeholder nodes into them, rather than importing
not-yet-built feature components. Each region (`HeaderClockSlot`, `SearchSlot`,
`ForecastSlot`, `FooterSlot`) renders a styled placeholder now and is replaced
by the real widget later. _Alternative considered:_ stub each feature component
upfront — rejected because it couples the shell to component APIs that are not
yet designed and creates churn.

**Server Components by default.** The shell is static layout, so all shell pieces
are Server Components. Only later capabilities (clock, search, map) introduce
`"use client"`. This keeps the initial client JS minimal (NFR-PERF-03).
_Alternative considered:_ a client-side layout shell — rejected; nothing in the
shell needs interactivity yet.

**Hero visibility driven by active-location state.** The hero/empty state shows
when there is no active location. For this change, with no URL state wired yet,
the page renders the hero unconditionally; the gate is structured as a single
boolean (`hasActiveLocation`) so `city-search` can flip it via the
`?lat=&lon=&name=` URL state (FR-SEARCH-03) without restructuring the layout.
_Alternative considered:_ hard-code only the hero — rejected; leaving the
conditional seam in place avoids a rewrite when search lands.

**Responsive grid with Tailwind breakpoints.** Use a CSS grid that is one column
by default, `md:` (768 px) two columns, `xl:` (1280 px) three columns, matching
Tailwind's default breakpoint scale, which already aligns with FR-SHELL-02. The
hero centers within the grid (spanning all columns) while empty; populated
regions later occupy specific columns. _Alternative considered:_ custom
container queries — rejected as overkill for fixed, well-known breakpoints.

**Component & i18n location.** Shell components live under `app/components/`
(co-located with the route that uses them); user-facing strings live in
`lib/i18n/uk.ts` with an `en.ts` fallback, per NFR-I18N-01 and TC-PURE-01
(`lib/` stays framework-free — these are plain string maps). _Alternative
considered:_ a top-level `components/` dir — either is fine; `app/components/`
keeps shell pieces near the only route consuming them.

**Tokens only.** All colors, radii, shadows, and motion come from the semantic
Tailwind utilities exposed in `globals.css` (`bg-bg`, `bg-surface`, `text-text`,
`text-brand`, `border-border`, `rounded-lg`, `shadow-sm`). No raw ramps, per
`DESIGN.md`.

## Risks / Trade-offs

- **Hydration mismatch from a static theme indicator** → The indicator reads the
  server-rendered `data-theme="light"` attribute and renders statically; no
  client clock or `Date`/`window` access in the shell, so there is no mismatch
  surface. Interactive theme work is deferred.
- **Placeholder slots could ship to production looking unfinished** → Style
  placeholders as calm, neutral skeleton/empty regions consistent with the
  design system, and keep the hero (the only fully designed first-load surface)
  prominent. Slots collapse gracefully when empty.
- **Breakpoint columns may look sparse before features fill them** → For this
  change only the hero is visible; multi-column population is exercised by later
  capabilities. The grid is verified at all three breakpoints with placeholder
  content to confirm the layout, then the hero takes over the empty state.
- **i18n convention set here propagates everywhere** → Keep `uk.ts`/`en.ts` as
  simple typed objects (no runtime i18n lib, per NFR-I18N-01) so the contract is
  obvious and cheap for downstream capabilities to extend.

## Migration Plan

Greenfield page replacement — no production users, no rollback concern. Replace
`app/page.tsx`, add shell components and the i18n files, verify
`lint + tsc + test + build` stays green (NFR-DX-01), then hand the slots to the
next capabilities.

## Open Questions

- Exact final hero copy wording — drafted here in `uk.ts`, to be confirmed
  against the design-system reference UI kit during implementation.
- Whether the theme indicator is an icon, a text label, or both — resolve from
  the reference `ui_kits/weather-explorer/` during build; behavior contract
  (reflects active theme, no toggle) is fixed regardless.
