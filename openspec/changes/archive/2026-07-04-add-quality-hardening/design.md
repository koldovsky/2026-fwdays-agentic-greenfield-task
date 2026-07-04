## Context

This is the acceptance-gate phase: measure the app as it stands (phases 0–7 all archived)
against NFR-001 (< 2s initial load), NFR-003 (Lighthouse Performance ≥ 95), and NFR-004
(WCAG 2.2 AA), then fix what's actually found — not a feature change.

Baseline measurements taken before any code changes:

- **Bundle**: this Next.js build already writes `.next/diagnostics/route-bundle-stats.json`
  with per-route first-load JS byte totals. Baseline: dashboard routes (`/notes`, `/search`,
  `/settings`, `/archive`, ...) are ~554–558K uncompressed first-load JS. `/notes/[id]` and
  `/notes/new` are ~630K / ~554K + editor code — `/notes/[id]` is the heaviest route in the
  app, ~76–80K above the dashboard baseline. `grep`ping the chunk files confirmed both
  `marked` and `dompurify` (used only for the note editor's live Markdown preview) live
  together in one 80K chunk, loaded unconditionally on every note-editor page view —
  including edits that never touch Preview mode.
- **Accessibility**: a manual pass over every interactive component found two real,
  fixable defects (not stylistic nits): the vendored `Tag` component's clickable chips have
  no keyboard semantics at all (`<span onClick>`, no `role`, no `tabIndex`, no key handler),
  and `SidebarFolderRow`/`SidebarTagRow`'s rename/delete actions are conditionally rendered
  only on mouse hover (`{hover && (...)}`) — not just visually hidden, absent from the DOM,
  so a keyboard-only user cannot tab to them at all. Color contrast was checked
  computationally (WCAG relative-luminance formula) for every text/surface pair the app
  actually uses: `gray-500` (text-tertiary) on white is 4.83:1, `gray-600` (text-secondary)
  is 7.63:1, `gray-900` (text) is 17.76:1, `indigo-600` (primary/links, both directions) is
  6.29:1 — all pass AA (≥ 4.5:1 for normal text); the one sub-AA pair, disabled text at
  2.60:1, is exempt under WCAG 1.4.3's disabled-content carve-out. No contrast fix needed.
  Focus-visible rings are already present on every interactive vendored component
  (`Button`, `IconButton`, `Input`, `Select`, `SearchField` all show `var(--shadow-focus)`
  on focus). No global `outline: none` reset exists.
- **Real Lighthouse run (production build, before any fixes)**: `/login` scored Performance
  97 / Accessibility 98; `/notes/[id]` scored Performance 99 / Accessibility 96 — both
  routes already clear NFR-003's ≥ 95 bar even before this change's fixes. The
  Accessibility runs did surface two genuine defects the manual pass and the computed
  contrast check above both missed:
  - `/notes/[id]`: `color-contrast` audit failed on the tag picker's unassigned-tag chips —
    `TagPicker`'s `style={{ opacity: 0.6 }}` (and `SearchView`'s `style={{ opacity:
    tagIds.has(tag.id) ? 1 : 0.5 }}` for unselected tag filters, same pattern) composites
    the chip's normally-compliant text color down to 2.79:1 against the card background,
    below the 4.5:1 minimum. Opacity dims the *rendered* color, not just perceived
    prominence — my earlier token-pair check only tested the undimmed CSS variables, not
    this runtime composite.
  - `/login` (and `/register`, same layout): `landmark-one-main` failed — `app/(auth)/layout.tsx`
    wraps its content in a plain `<div>`, with no `<main>` landmark anywhere on the page.

  Both are added to this change's scope (Decisions 6–7 below) since they're real,
  Lighthouse-confirmed WCAG failures surfaced by the very measurement this phase exists to
  do — not surfaced by planning, only by actually running the tool.

## Goals / Non-Goals

**Goals:**
- Defer the note editor's Markdown-preview dependencies (`marked` + `dompurify`) out of
  the route's initial JS, loading them only when Preview mode is actually used.
- Fix the two real keyboard-accessibility defects found above.
- Add a skip-to-content link (WCAG 2.4.1) and toggle-button state (`aria-pressed`, WCAG
  4.1.2) — both cheap, direct fixes for gaps the audit surfaced.
- Re-measure (bundle stats, Lighthouse Performance, Lighthouse Accessibility, manual
  keyboard walkthrough) after the fixes and record the before/after numbers as the
  acceptance evidence for NFR-001/003/004.

**Non-Goals:**
- Pagination on `/notes` or `/search`. This would help NFR-001/003 at large data volumes,
  but nothing in `requirements.md` asks for it (FR-060..064 and the notes-core list views
  were both built unpaginated by design in earlier phases) and the seed-scale dataset this
  app is measured against doesn't exercise it. Flagged as a risk below, not fixed.
- Image optimization / `next/image` — the app has no user-facing images today (the one
  `<img>` in the vendored `Avatar` component is dead code, unused anywhere in the app).
- A full WCAG 2.2 AA conformance audit against every success criterion. Lighthouse's
  Accessibility category (axe-core-based, closest available automated proxy) plus a manual
  keyboard-only pass over the core flows (login, create/edit note, folder/tag assign,
  search, delete) is the "spot-check" bar this project's own workflow sets for this
  capability — matching how every other capability in this project was verified.
- Adding `@next/bundle-analyzer` or any new dependency. `route-bundle-stats.json` (already
  emitted by this Next.js version's build) is sufficient for a before/after comparison.

## Decisions

### 1. Defer `marked`/`dompurify` via `dynamic import()` gated on Preview mode, not `next/dynamic`

`NoteEditor`'s `previewHtml` is currently computed by a `useMemo` that calls
`renderMarkdown` (marked) and `sanitizeClientHtml` (dompurify) synchronously, imported at
module scope — so both libraries are in the route's initial JS whether or not the user
ever clicks "Preview" (the default mode is "Write"). Two ways to defer:

- (a) `next/dynamic(() => import(".../note-preview"), { ssr: false })` on the whole
  `NotePreview` component. Splits the *rendering component*, but `renderMarkdown` /
  `sanitizeClientHtml` are called in `NoteEditor` itself (to memoize the string), not
  inside `NotePreview` — this wouldn't actually move `marked`/`dompurify` out of
  `NoteEditor`'s own chunk.
- (b) `await import("@/lib/markdown/render")` / `await import("@/lib/markdown/sanitize.client")`
  directly inside an effect that only runs when `mode === "preview"`, storing the result in
  state seeded with the existing server-rendered `initialPreviewHtml`. **Chosen** — moves
  the two heavy libraries into their own chunk that only loads on first entry into Preview
  mode, and keeps the existing "identical to initial content → reuse
  `initialPreviewHtml`, no client render needed" fast path untouched.

Concretely: replace the `useMemo` with `useState(initialPreviewHtml)` + a `useEffect` keyed
on `[mode, content]` that, when `mode === "preview"` and `content !== initialContent`,
dynamically imports both modules and sets the computed HTML; a `cancelled` flag guards
against a stale response if the user flips mode again before the import resolves.

### 2. Fix `Tag.jsx` in place (vendored) rather than wrapping it in app code

The keyboard-inaccessibility is in the vendored component itself (`Tag.jsx`'s `<span
onClick>`), used as a clickable filter/toggle chip in two places (`search-view.tsx`,
`tag-picker.tsx`'s unassigned-tag chips). Wrapping every call site in a focusable div would
duplicate the fix and still leave the raw `Tag` broken for any future caller. Per
`DESIGN.md`'s own rule ("don't edit vendored files casually... if a change is genuinely
needed, record it in `DESIGN.md`'s Local adaptations list"), this qualifies: add
`role="button"`, `tabIndex={0}`, and an `onKeyDown` handler (Enter/Space → `onClick`) when
`onClick` is provided and the chip isn't already a `removable` chip (those already have a
focusable `<button>` for removal; the chip body itself is inert in that case, e.g. the
assigned-tag chips in `TagPicker`).

### 3. Sidebar row actions: `group-focus-within` alongside the existing hover reveal

`SidebarFolderRow`/`SidebarTagRow` already set `className="group ..."` on the row and
track `hover` state in React purely to decide `{hover && (...)}`. Fix: always render the
actions `<div>`, and use Tailwind's `opacity-0 group-hover:opacity-100
group-focus-within:opacity-100` so the actions are invisible-but-present until hovered *or*
until a keyboard user tabs to (focuses within) the row — at which point they become both
visible and reachable. The existing React `hover` state becomes unnecessary for this
purpose but is left as-is (also drives the row's background-color highlight, unrelated to
this fix).

### 4. Skip link placed in `AppShell`, not the root layout

The root `app/layout.tsx` wraps both dashboard and auth routes; the sidebar nav that needs
bypassing only exists in `AppShell` (dashboard routes). Add the skip link as the first
child of `AppShell`'s returned JSX, an `<a href="#main-content">` visually hidden via
Tailwind's `sr-only focus:not-sr-only` pattern (already idiomatic Tailwind, no new CSS
needed), and give the existing `<main>` an `id="main-content"`.

**Refinement found during verification**: a plain `<main id="main-content">` scrolls into
view on activation but does not receive actual keyboard focus — browsers only move focus
to a fragment target if it's focusable. Added `tabIndex={-1}` (focusable via script/fragment,
not part of normal Tab order) and `outline-none` (suppressing the focus ring on the whole
content area, since the skip link itself already showed one) — confirmed via a real
keyboard-driven browser check that `document.activeElement` becomes `#main-content` after
activating the link, not just a scroll-only jump.

### 5. Measurement: production build, not dev server

Lighthouse scores against `next dev` are meaningfully worse than production (no
minification, dev-only React warnings/overhead, no production chunk hashing) and would
misstate NFR-003. Measure against `next build && next start` instead, via `npx lighthouse
--only-categories=performance` (scoped to the Performance category per NFR-003's exact
wording) for the Performance number, and `--only-categories=accessibility` for the
Accessibility spot-check, on `/login` (lightest route) and `/notes/[id]` (heaviest route,
and the one this change directly optimizes).

### 6. Replace opacity-based tag-chip dimming with a non-opacity visual difference

`TagPicker`'s unassigned chips and `SearchView`'s unselected tag filter chips both signal
"less prominent" by dropping CSS `opacity` to 0.5–0.6. `opacity` dims the *rendered*
(post-composite) color against its background, not just perceived weight — so a
token pair that's compliant at full opacity can fail contrast once dimmed, which is
exactly what happened (2.79:1, confirmed by Lighthouse). Fix both call sites to signal
"less prominent" without lowering opacity: unassigned chips in `TagPicker` get a dashed
border (`borderStyle: "dashed"`) instead of `opacity: 0.6`, keeping the default `Tag` text
color (`--color-text-secondary`, 7.63:1 — safe); unselected chips in `SearchView` are left
at `Tag`'s untouched default styling, and *selected* chips instead get a highlighted
treatment (`--color-primary-subtle` background, `--color-primary` text/border) — inverting
which state gets the visual emphasis, but neither state now depends on opacity.

### 7. Add a `<main>` landmark to the auth layout

`app/(auth)/layout.tsx` (shared by `/login` and `/register`) has no landmark region at all
— confirmed by Lighthouse's `landmark-one-main` audit. Wrap `{children}` in a `<main>`
inside that layout; no other structural change needed (the branding header above the form
stays outside `<main>`, matching how `AppShell`'s header sits outside its own `<main>`).

## Risks / Trade-offs

- [Risk] Deferring the preview render means the *first* switch to Preview mode has a brief
  delay (network/parse time for the ~80K chunk) instead of being instant → Mitigation:
  acceptable one-time cost per session (the chunk is cached by the browser after); Preview
  is a secondary mode, Write is the default and the common case while actively editing.
- [Risk] `/notes` and `/search` still fetch their full result sets unbounded (no
  pagination) → Mitigation: not fixed here (see Non-Goals); acceptable at current/seed data
  volume, flagged for product if note counts grow large enough to threaten NFR-001/003.
- [Risk] Lighthouse scores are somewhat run-to-run noisy (machine load, network) → Mitigation:
  take the Performance/Accessibility numbers as directional evidence for the acceptance
  gate, matching this project's existing "spot-check" verification bar for every other NFR
  so far, not as a hard CI gate (no Lighthouse CI pipeline is being added).

## Migration Plan

No data migration. Deploy is just the usual `npm run build`; no schema, env, or dependency
changes. Rollback is reverting the touched files — all changes are additive/corrective to
existing client code, nothing stateful.

## Open Questions

- None blocking. Pagination is the only deferred item, and it's explicitly out of scope per
  the Non-Goals above.
