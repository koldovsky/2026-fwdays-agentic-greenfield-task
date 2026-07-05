## Why

This is the formal acceptance gate for the whole app (phase 8, the last capability on the
critical path): NFR-001 (initial load < 2s), NFR-003 (Lighthouse Performance ≥ 95), and
NFR-004 (WCAG 2.2 AA) were meant to be applied incrementally across phases 0–7 but were
never measured or gated as a whole. A pass over the built app (not a new feature) is needed
to measure where it stands and fix what's actually broken.

## What Changes

- Lazy-load the note editor's Markdown preview path (`marked` + `dompurify`, ~80KB
  uncompressed) via dynamic `import()`, deferred until the user switches into Preview mode,
  instead of loading it unconditionally with every note-editor page.
- Fix a real keyboard-accessibility gap in the vendored `Tag` component: clickable tag
  chips (`onClick` with no `onRemove`) are a bare `<span onClick>` with no keyboard
  semantics at all — unreachable and unusable via keyboard. Add `role="button"`,
  `tabIndex={0}`, and Enter/Space activation when `onClick` is passed without `removable`.
- Fix `SidebarFolderRow`/`SidebarTagRow`: their rename/delete actions are only rendered
  when the row is hovered, so a keyboard-only user can never reach them (not just visually
  hidden — absent from the DOM). Render them always, revealed on hover *or* focus-within.
- Add a "Skip to content" link so keyboard/screen-reader users can bypass the sidebar
  navigation, present on every dashboard route, without tabbing through it first
  (WCAG 2.4.1 Bypass Blocks).
- Add `aria-pressed` to the note editor's Write/Preview toggle buttons so their state is
  exposed to assistive tech (WCAG 4.1.2 Name, Role, Value).
- Measure: Lighthouse Performance score (production build) on representative routes, and a
  manual keyboard-only + Lighthouse-Accessibility spot-check, both before and after the
  fixes above, as the acceptance evidence for NFR-001/003/004.

**Not changing:** color contrast (already verified ≥ 4.5:1 on all non-disabled text/surface
pairs used in the app — no fix needed), pagination on `/notes` or `/search` (a data-volume
concern, not something the current seed-scale app or FR-060..064 asks for; flagged as a
future risk, not fixed here), and no new features — this change touches only cross-cutting
performance/accessibility code paths already built in prior phases.

## Capabilities

### New Capabilities
- `quality-hardening`: cross-cutting performance and accessibility requirements for the
  whole app — initial load time, Lighthouse Performance score, and WCAG 2.2 AA compliance.

### Modified Capabilities
- none — this change fixes implementation details (a vendored component's keyboard
  handling, a lazy-load boundary, a skip link) underneath existing capabilities; no
  capability's functional requirements change.

## Impact

- **Modified**: `.agents/skills/notely-design/components/core/Tag.jsx` (recorded as a
  Local adaptation in `DESIGN.md`), `app/components/notes/note-editor.tsx` (lazy preview),
  `app/components/layout/sidebar-folder-row.tsx`, `app/components/layout/sidebar-tag-row.tsx`,
  the dashboard layout (skip link).
- **No schema, API, or route changes.** No new dependencies — the measurement tools
  (`lighthouse`, `playwright`) are run via `npx`/already available, not added to
  `package.json`.
