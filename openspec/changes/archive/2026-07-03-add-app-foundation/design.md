## Context

The repo has Next.js App Router, Notely design tokens wired via `app/globals.css`, and `@notely-design/components` available. `app/page.tsx` is a standalone demo page. The UI kit at `.agents/skills/notely-design/ui_kits/notely-app/` demonstrates the target shell (sidebar, theme toggle, route switching) but is not integrated into the app.

Phase 0 (`add-app-foundation`) delivers a runnable dashboard shell with no backend, auth, or note data. Requirements: UI-001, UI-003, UI-004, NFR-005.

## Goals / Non-Goals

**Goals:**

- Dashboard route group with shared layout (sidebar + main)
- Theme toggle with `localStorage` persistence via `data-theme` on `<html>`
- Collapsible sidebar with persisted state
- Responsive behavior: overlay sidebar on mobile, side-by-side on tablet/desktop
- Static routes for PRD nav items with placeholder pages
- Components built with Notely design system per `DESIGN.md`

**Non-Goals:**

- Authentication, user sessions, or protected routes
- Database, Prisma, or server actions for notes
- Real note list, editor, folders, or tags data
- Search, autosave, or markdown editor
- Settings page beyond theme toggle (full settings comes later)
- WCAG audit gate (NFR-004 deferred to `quality-hardening`)

## Decisions

### 1. Route structure: `(dashboard)` route group

Use `app/(dashboard)/layout.tsx` for the shell and nested routes:

```
app/
  layout.tsx              # root: fonts, html/body
  page.tsx                # redirect to /notes
  (dashboard)/
    layout.tsx            # AppShell: sidebar + main
    notes/page.tsx        # All Notes (default)
    favorites/page.tsx
    pinned/page.tsx
    archive/page.tsx
    trash/page.tsx
    settings/page.tsx
    notes/new/page.tsx    # placeholder editor
```

**Rationale:** Route group keeps the shell DRY; each nav item gets a real URL for later data wiring. **Alternative:** Single page with client-side tab state — rejected because App Router URLs are needed for deep linking and future SSR.

### 2. Theme: `ThemeProvider` client component + `data-theme`

Mirror the UI kit: set `document.documentElement.dataset.theme` to `"light"` or `"dark"`. Persist under key `notely:theme:v1` in `localStorage`.

Inject a blocking inline script in root layout (or `ThemeProvider`) to read stored theme before paint and avoid flash — same pattern as React best-practice for hydration.

**Rationale:** Design tokens already use `[data-theme="dark"]`; no CSS-in-JS library needed. **Alternative:** `next-themes` — rejected to minimize dependencies for phase 0.

### 3. Sidebar collapse: CSS + React state

Desktop/tablet: toggle between full width (~244px) and icon-only (~56px). Mobile: sidebar hidden by default; hamburger opens overlay drawer with backdrop.

Persist collapsed state in `localStorage` (`notely:sidebar-collapsed:v1`). Use Tailwind breakpoints aligned with design system spacing (e.g. `md:768px`, `lg:1024px`).

**Rationale:** Matches UI kit behavior and UI-003/UI-004. **Alternative:** CSS-only `:has()` — insufficient for mobile overlay pattern.

### 4. Component placement

```
components/
  layout/
    app-shell.tsx         # flex container, mobile drawer state
    sidebar.tsx           # nav links, collapse toggle, new note button
    theme-toggle.tsx
  providers/
    theme-provider.tsx
lib/
  nav-items.ts            # static nav config (id, label, href, icon)
```

Import UI primitives from `@notely-design/components` (`Button`, `FolderItem`, `IconButton`, etc.). Reference `ui_kits/notely-app/Sidebar.jsx` for structure, not copy-paste.

### 5. Static navigation data

Hard-code nav items and placeholder folder/tag sections in `lib/nav-items.ts`. Folder/tag rows are non-interactive placeholders until `add-folders-tags`.

### 6. Responsive breakpoints

| Breakpoint | Sidebar behavior | Main content |
|------------|------------------|--------------|
| &lt; 768px (mobile) | Overlay drawer, closed by default | Full width |
| 768px–1023px (tablet) | Collapsible, default expanded | Flex remainder |
| ≥ 1024px (desktop+) | Collapsible, default expanded | Max-width content optional |

Verify at 320px, 768px, 1024px, and 1920px+ viewports.

## Risks / Trade-offs

- **[Theme flash on load]** → Inline script sets `data-theme` before React hydrates
- **[localStorage unavailable]** → Fall back to light theme and expanded sidebar; wrap reads/writes in try/catch
- **[Sidebar overlay traps focus]** → Trap focus in mobile drawer; close on Escape and backdrop click
- **[Placeholder routes feel empty]** → Minimal empty-state copy per Notely voice; real content in later phases

## Migration Plan

1. Add layout components and providers
2. Create `(dashboard)` routes with placeholders
3. Change `app/page.tsx` to redirect to `/notes`
4. Remove demo content from old home page
5. Manual smoke test at key breakpoints and both themes

No database migration. Rollback: revert layout and route files.

## Open Questions

None blocking phase 0. Icon set: use inline SVG or lucide-react with `optimizePackageImports` if icons are needed beyond design system components.
