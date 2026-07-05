## Why

Notely has a connected design system and a placeholder home page, but no application shell. Every subsequent capability (auth, notes, search) needs a shared layout with navigation, theming, and responsive behavior. Phase 0 establishes that runnable shell before any backend or user data.

## What Changes

- Replace the standalone home page with a dashboard layout: collapsible sidebar + main content area
- Wire light/dark theme toggle with persistence across sessions (UI-001)
- Add static sidebar navigation matching PRD information architecture (All Notes, Favorites, Pinned, Archive, Trash, Folders, Tags placeholders)
- Implement responsive layout from 320px to 4K (UI-004, NFR-005)
- Add route structure under App Router for dashboard views (placeholder content only)
- Introduce theme provider and sidebar state (collapsed/expanded) with client-side persistence

## Capabilities

### New Capabilities

- `app-foundation`: Application shell with Notely design system, theme switching, collapsible sidebar, responsive layout, and static dashboard routes. Covers UI-001, UI-003, UI-004, NFR-005.

### Modified Capabilities

<!-- No existing specs yet -->

## Impact

- **App routes:** New `(dashboard)` route group with layout; move or replace `app/page.tsx`
- **Components:** New layout components under `components/` or `features/layout/` (sidebar, shell, theme toggle)
- **Client state:** Theme preference in `localStorage`; sidebar collapsed state persisted
- **Dependencies:** Existing `@notely-design/components` and design tokens; no backend, Prisma, or auth yet
- **Reference:** `.agents/skills/notely-design/ui_kits/notely-app/` for shell patterns
