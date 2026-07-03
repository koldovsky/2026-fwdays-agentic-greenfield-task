## Context

The repo is a bare `create-next-app` scaffold on **Next.js 16.2.10 / React 19.2**
(App Router). The scaffold ships English `lang="en"`, Geist fonts, and a Tailwind v4
`@import "tailwindcss"` in `app/globals.css` with an `@theme` block and a
`@tailwindcss/postcss` PostCSS plugin. None of this matches the product:

- `TC-STACK-01` mandates a **vanilla-CSS design system with no CSS-framework
  dependency**. Tailwind must go.
- A real design system already exists at `docs/design-system/` (`tokens.css` →
  `typography.css` → `base.css` → `components.css`) exposing `--pk-*` tokens and
  `.pk-*` classes, documented in `DESIGN.md`. It currently loads its fonts via a
  Google Fonts `@import` in `typography.css`.
- Product constraints in scope: `NFR-RESP-01`, `NFR-A11Y-01`, `BC-LANG-01`,
  `TC-STACK-01`, `TC-PLATFORM-01`, `BC-DEADLINE-01`, and the passive-disclaimer part
  of `BC-HONESTY-01`.

This is the Wave 0 foundation every UI capability inherits, so the decisions here
(fonts, CSS load order, formatting helpers, frame structure) become conventions for
all downstream slices.

## Goals / Non-Goals

**Goals:**
- A Ukrainian (`lang="uk"`), responsive root layout that renders the design system.
- Design-system CSS vendored into the app and imported once in the required order.
- Prokhidnyi fonts (Unbounded, Manrope) self-hosted via `next/font`, bound to
  `--pk-font-*` tokens with no external font requests at runtime.
- `uk-UA` formatting helpers (number, percent, date) for downstream reuse.
- Passive global surfaces: honesty disclaimer + deadline banner on every route.
- Tailwind fully removed from deps and the styling pipeline.

**Non-Goals:**
- Feature pages / real content (score input, recommendations, etc.).
- Active deadline reminders or countdowns (that is `deadline-reminders`, Phase 3).
- The chance-calculation model (`scoring-engine`) — the disclaimer here is passive copy.
- Dark mode / theming beyond what the design tokens already define.
- i18n framework / multi-locale switching — the app is Ukrainian-only for MVP.

## Decisions

### D1 — Vendor the design-system CSS into the app; import in the root layout
Copy `docs/design-system/{tokens,typography,base,components}.css` into an app-owned
location (e.g. `app/styles/`) and `import` them, in that exact order, at the top of
`app/layout.tsx` (or via a single `globals.css` that `@import`s them in order).
Import ordering is significant — Next.js orders CSS by import order and the tokens
must load first.
- *Why not reference `docs/` directly:* `docs/` is documentation, not a build input;
  the app should own its runtime CSS so the design source can evolve independently.
- *Alternative — keep it as one big CSS file:* rejected; the four-file split is the
  documented contract in `DESIGN.md` and keeps token/component concerns separable.

### D2 — Remove Tailwind entirely
Delete `@import "tailwindcss"` and the `@theme`/scaffold rules from `globals.css`,
drop `tailwindcss` + `@tailwindcss/postcss` from `package.json`, and remove/empty
`postcss.config.mjs`. Strip Tailwind utility classes from the scaffold
`layout.tsx`/`page.tsx`. This is a **BREAKING** change to the styling pipeline but
required by `TC-STACK-01`, and cheapest to do now before any feature CSS exists.
- *Alternative — leave Tailwind installed but unused:* rejected; `TC-STACK-01` says
  "no CSS framework dependency," and a dormant framework invites accidental use.

### D3 — Fonts via `next/font/google`, bound to `--pk-font-*` tokens
Load `Unbounded` and `Manrope` with `next/font/google` (self-hosting, no runtime
Google requests — satisfies the privacy/perf intent and avoids the `@import` in the
vendored `typography.css`). Expose each as a CSS variable via the `variable` option
and set those variables onto the design system's `--pk-font-display` / `--pk-font-body`
tokens (applied on `<html>`/`<body>`). Remove the Google `@import` from the vendored
`typography.css` so fonts are not fetched twice.
- *Why not `next/font/local`:* would require committing `.woff2` files; the Google
  loader self-hosts automatically and is simpler. Revisit only if offline builds need it.
- *Why bind to tokens rather than `className`:* the whole design system references
  `--pk-font-*`; binding once keeps every `.pk-*` class correct without per-component classes.

### D4 — Frame structure: server-component layout + small shell components
`app/layout.tsx` (server component) renders `<html lang="uk">` → `<body>` → header,
deadline banner, main content container, and disclaimer. Shell pieces (header/nav,
`DeadlineBanner`, `Disclaimer`, content container) are small server components using
`.pk-banner`, `.pk-*` classes. Responsiveness comes from CSS (design-system tokens +
a light responsive container), not JS. Home `page.tsx` becomes a demo page that
exercises the frame so the shell is verifiable.
- *Why server components:* the shell is static; no client interactivity is needed yet,
  keeping the bundle minimal.

### D5 — Locale helpers in a shared module
Add `app/lib/format.ts` with `formatNumber`, `formatPercent`, `formatDate` built on
`Intl.NumberFormat`/`Intl.DateTimeFormat` with the `uk-UA` locale. Single source of
truth so downstream slices (`scoring-engine`, `recommendations`) format identically.
- *Alternative — a date/i18n library:* rejected; `Intl` covers `uk-UA` number/date
  needs with zero dependencies, consistent with the no-framework ethos.

### D6 — Non-color-only signaling as a shell convention
Where the shell shows chance/status color (traffic-light green/amber/red), it always
pairs color with a text label or dot/shape (the design system's `.pk-pill` already
includes a `.pk-pill__dot`). Codified here so every downstream slice inherits it
(`NFR-A11Y-01`).

## Risks / Trade-offs

- **CSS import-order regressions** → Import all four design-system files from a single
  entry (root layout / one `globals.css`) in the documented order and verify against a
  production `next build`, where ordering is authoritative (dev can differ).
- **Duplicate font loading** (Google `@import` in vendored `typography.css` *and*
  `next/font`) → Remove the `@import` from the vendored copy; fonts come only from
  `next/font`. Verify no network request to `fonts.googleapis.com` at runtime.
- **Design source drift** (vendored copy diverges from `docs/design-system/`) → Treat
  the vendored CSS as generated-from-source; note the origin in a comment/README and
  re-sync when `DESIGN.md`/tokens change rather than hand-editing.
- **Tailwind removal breaks the scaffold page** → The scaffold `page.tsx` uses Tailwind
  utilities; it is replaced by the design-system demo page in the same change, so no
  orphaned utility classes remain.
- **Placeholder deadline content read as real** → The deadline banner is explicitly
  passive/placeholder for this capability; label it as such so it isn't mistaken for a
  live reminder (active reminders are `deadline-reminders`).

## Migration Plan

1. Vendor the four design-system CSS files into the app and wire imports in order.
2. Add `next/font` families and bind them to `--pk-font-*`; strip the Google `@import`
   from the vendored `typography.css`.
3. Rewrite `app/layout.tsx` (Ukrainian `lang`/metadata, frame, disclaimer, deadline
   banner) and replace `app/page.tsx` with the shell demo.
4. Add `app/lib/format.ts` locale helpers.
5. Remove Tailwind: deps in `package.json`, `postcss.config.mjs`, and `globals.css`
   `@import`/`@theme`.
6. Verify with `next build` (CSS order) and a manual desktop→phone resize check.

Rollback: revert the change branch; no data or schema is touched, so rollback is
purely code/deps.

## Open Questions

- Vendored CSS location and single-import strategy: `app/styles/*.css` imported
  individually vs. one `app/globals.css` that `@import`s them — decide during apply
  (both satisfy the ordering requirement).
- Exact placeholder copy for the deadline banner and disclaimer (Ukrainian wording) —
  finalize against `docs/PRD.md`/prototype during implementation.
