## Why

The Next.js app is still the bare `create-next-app` scaffold: English `<html lang>`,
Geist fonts, and a Tailwind `@import` in `globals.css` — none of which match the
product. Every UI capability (`score-input`, `recommendations`, `filtering`, …)
needs a Ukrainian, design-system-driven, responsive frame to render inside. Rather
than have each slice re-solve layout, locale, fonts, and the global honesty/deadline
surfaces, we establish them once as the Wave 0 `app-shell` foundation. Doing it now
unblocks all downstream UI work and removes the Tailwind dependency that violates
`TC-STACK-01` before any feature code is written on top of it.

## What Changes

- Replace the scaffold root layout with a Ukrainian shell: `<html lang="uk">`,
  Prokhidnyi fonts (Unbounded for headings/numerals, Manrope for body) via
  `next/font/google` exposed as `--pk-font-*` variables, and app metadata in Ukrainian.
- **BREAKING** Remove Tailwind from the styling pipeline (`@import "tailwindcss"`,
  `@tailwindcss/postcss`, `postcss.config.mjs`, the `@theme`/scaffold rules) to honor
  `TC-STACK-01` (vanilla-CSS design system, no CSS framework). Any Tailwind utility
  classes left in the scaffold `page.tsx`/`layout.tsx` are removed.
- Vendor the design system CSS (`tokens.css` → `typography.css` → `base.css` →
  `components.css`) into the app and import it in the required order in the root layout,
  wiring the `next/font` families into the `--pk-font-*` tokens.
- Add a responsive app frame: global header/nav region and a centered, max-width
  content container that adapts from desktop down to a phone-sized window, with all
  interactive targets ≥ 44px (`NFR-RESP-01`).
- Add two passive global surfaces rendered by the shell: a **disclaimer slot**
  (`BC-HONESTY-01` — chances are estimates, never guarantees) and a **deadline banner
  slot** (`BC-DEADLINE-01`), both using `.pk-*` components and present on every route.
- Add `uk`-locale formatting helpers (numbers, percentages, dates via
  `Intl.NumberFormat`/`Intl.DateTimeFormat` with the `uk-UA` locale) for downstream
  slices to consume (`BC-LANG-01`).
- Replace the placeholder home page with a shell demo page that renders the frame,
  disclaimer, and deadline banner so the shell is verifiable end-to-end.

## Capabilities

### New Capabilities
- `app-shell`: the responsive Ukrainian root layout, design-system CSS wiring, font
  loading, `uk`-locale formatting helpers, and the global disclaimer + deadline
  surfaces that every UI slice inherits.

### Modified Capabilities
<!-- None — this is the first spec authored; no existing capability's requirements change. -->

## Impact

- **Code:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (rewritten/removed);
  new `app/styles/` (or `app/design-system/`) vendored CSS, `app/lib/format.ts` locale
  helpers, and shell components (header, disclaimer, deadline banner, content frame).
- **Config / dependencies:** remove `tailwindcss` + `@tailwindcss/postcss` from
  `package.json` and delete/empty `postcss.config.mjs`; add the two Google font families
  through `next/font`.
- **Requirements traced:** `NFR-RESP-01`, `NFR-A11Y-01`, `BC-LANG-01`, `TC-STACK-01`,
  `TC-PLATFORM-01`, `BC-DEADLINE-01`, plus the passive-surface part of `BC-HONESTY-01`.
- **Downstream:** unblocks every Wave 1+ UI capability; no runtime data or backend
  impact (static shell only).
