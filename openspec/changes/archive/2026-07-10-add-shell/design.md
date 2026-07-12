# Design: add-shell (FR-SHELL-02 responsive layout)

## Context

The dashboard shell (`src/app/(dashboard)/layout.tsx`) renders `AppSidebar`
(`src/components/layout/app-sidebar.tsx`) at a fixed 224 px width (`w-56`) for
every viewport. Below 768 px the sidebar consumes most of the screen and the
shell overflows horizontally, so FR-SHELL-02 is unmet. FR-SHELL-01 (routes +
navigation) and FR-SHELL-03 (health endpoint) are already in place and must not
regress. Constraint from the session brief: **`src/lib/` is not touched** —
consistent with the capability's own rule that shell owns no domain logic.

## Goals / Non-Goals

**Goals:**

- Shell reflows at the 768 px breakpoint per the delta spec
  (`specs/shell/spec.md`): persistent sidebar ≥ 768 px, mobile navigation below.
- No horizontal overflow at 375 px on landing and all dashboard routes.
- Zero new dependencies; WEG3D Fin tokens and existing shadcn primitives only.

**Non-Goals:**

- Invoice preview implementation (S3/S4 capabilities); shell only guarantees
  the container reflows.
- Ukrainian UI-string sweep (NFR-I18N-01), BC-LEGAL-02 disclaimer, design-token
  changes (wayfinder ticket 11).
- Any change under `src/lib/` or `src/app/api/`.

## Decisions

1. **Breakpoint = Tailwind `md:`** — Tailwind v4's default `md` breakpoint is
   exactly 768 px, matching FR-SHELL-02 verbatim. No custom breakpoint token.
   *Alternative considered:* custom `wf-shell` screen token — rejected, adds a
   token while ticket 11 (token reconciliation) is still open.
2. **Mobile navigation = header bar + `Sheet`** — below `md`, the dashboard
   header shows the brand plus a menu `Button` that opens the existing shadcn
   `Sheet` (`src/components/ui/sheet.tsx`, `side="left"`) containing the same
   nav items. *Alternatives considered:* icon rail (still steals width from the
   375 px preview surface — rejected); CSS-only `<details>` disclosure (no
   focus management, weaker a11y than Sheet's built-in dialog semantics —
   rejected).
3. **Single source of nav items** — extract the `navItems` array into
   `src/components/layout/nav-items.ts` shared by `AppSidebar` and the new
   `MobileNav`, so desktop and mobile menus cannot drift. This lives in
   `src/components/`, not `src/lib/`, respecting the constraint.
4. **Sidebar becomes desktop-only via CSS** — `hidden md:flex` on the existing
   `<aside>`; component API unchanged, no conditional rendering in JS (avoids
   hydration mismatch and keeps the diff minimal).
5. **One header, responsive content** — the existing `h-14` dashboard header
   gains a `md:hidden` menu button and brand; "Workspace overview" copy stays.
   No second header element.
6. **Accessibility** — menu button is a real `<button>` (shadcn `Button`,
   `size="icon"`, `h-9`) with an `aria-label`; `Sheet` provides focus trap and
   `Esc` dismissal; nav landmark semantics (`<nav>`) preserved in both menus.

## Risks / Trade-offs

- [Ticket 11 may rework design tokens] → use only existing `wf-*` utilities and
  shadcn semantic tokens; no raw hex, no new tokens — reconciliation stays
  orthogonal.
- [Sheet overlay vs `backdrop-blur` header stacking] → verify z-index layering
  manually at 375 px; Sheet renders in a portal, so conflicts are unlikely.
- [Landing page (`src/app/page.tsx`) state unknown at small widths] → verify at
  375 px during implementation; apply minimal utility-class fixes only.
- [No e2e harness in MVP] → verification is the manual viewport checklist from
  `docs/capabilities/shell.md` plus `npm run typecheck && npm run lint &&
  npm run build` (NFR-PERF-01: build < 60 s).

## Migration Plan

Pure UI-layer change; no data, storage, or API surface. Deploy with the normal
build; rollback = revert the commit.

## Open Questions

- None blocking. Nav-label language (English today) is deferred to the
  capability-level i18n pass (NFR-I18N-01), tracked outside this change.
