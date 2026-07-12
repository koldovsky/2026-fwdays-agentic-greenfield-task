# Tasks: add-shell (FR-SHELL-02)

> Constraint: no edits under `src/lib/` or `src/app/api/` anywhere in this change.

## 1. Preflight

- [x] 1.1 Run `npm run capability:check -- --capability shell` and confirm the gate is OK
- [x] 1.2 Invoke `.agents/skills/weg3d-fin-design` skill (post the 🎨 session banner) before touching UI files

## 2. Shared navigation source

- [x] 2.1 Extract `navItems` from `src/components/layout/app-sidebar.tsx` into `src/components/layout/nav-items.ts` and import it back; verify with `npm run typecheck`

## 3. Responsive dashboard shell

- [x] 3.1 Make `AppSidebar` desktop-only via `hidden md:flex` on the `<aside>`; verify sidebar unchanged at ≥ 768 px
- [x] 3.2 Create `src/components/layout/mobile-nav.tsx`: shadcn `Sheet` (`side="left"`) opened by an icon `Button` (`h-9`, `aria-label`), rendering `navItems` links that close the sheet on navigation
- [x] 3.3 Wire `MobileNav` + brand into the dashboard header in `src/app/(dashboard)/layout.tsx` (visible `md:hidden`); keep the single `h-14` header and "Workspace overview" copy
- [x] 3.4 Manual check at 375 px: dashboard, invoices, invoices/new, clients, settings — no horizontal overflow of the page body, all nav destinations reachable via the sheet

## 4. Landing page reflow

- [x] 4.1 Verify `src/app/page.tsx` at 375 px and 768 px; apply minimal Tailwind utility fixes if it overflows (no token or design changes)

## 5. Verification

- [x] 5.1 Run `npm run typecheck && npm run lint && npm run build`; confirm build < 60 s (NFR-PERF-01)
- [x] 5.2 Walk the `docs/capabilities/shell.md` verification checklist: landing → dashboard without auth, all sidebar links resolve, `curl /api/health` returns 200 JSON, 375 px viewport clean
- [x] 5.3 Run `openspec validate add-shell --strict` and confirm the delta spec passes

## 6. Ship & handoff

- [x] 6.1 After verification: `/opsx:sync` to merge the delta into `openspec/specs/shell/spec.md`
- [x] 6.2 Update traceability: `docs/requirements.md` FR-SHELL-02 → `shipped`, `docs/capabilities/shell.md` table, `openspec/capability-map.yaml` `shell: status: shipped` (unlocks S2)
- [x] 6.3 Update `docs/current-state.md` (completed work, session log, next up)
