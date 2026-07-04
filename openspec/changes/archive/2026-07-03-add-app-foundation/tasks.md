## 1. Foundation and config

- [x] 1.1 Add `lib/nav-items.ts` with static nav routes (All Notes, Favorites, Pinned, Archive, Trash, Settings) and placeholder folder/tag labels
- [x] 1.2 Add storage helpers in `lib/storage.ts` for versioned `localStorage` keys (`notely:theme:v1`, `notely:sidebar-collapsed:v1`) with try/catch fallbacks

## 2. Theme system (UI-001)

- [x] 2.1 Create `components/providers/theme-provider.tsx` — client provider that reads/writes theme, sets `data-theme` on `<html>`
- [x] 2.2 Add inline theme bootstrap script in root `app/layout.tsx` to prevent flash of wrong theme on load
- [x] 2.3 Create `components/layout/theme-toggle.tsx` using Notely design components
- [x] 2.4 Wrap app in `ThemeProvider` from root layout

## 3. Dashboard shell (UI-003, UI-004, NFR-005)

- [x] 3.1 Create `components/layout/sidebar.tsx` — logo, New note button, nav links via `FolderItem`, placeholder Folders/Tags sections, Settings link, collapse toggle
- [x] 3.2 Create `components/layout/app-shell.tsx` — flex layout, sidebar collapse state, mobile overlay drawer with backdrop and Escape-to-close
- [x] 3.3 Create `app/(dashboard)/layout.tsx` wrapping children in `AppShell`
- [x] 3.4 Add responsive styles: overlay sidebar below 768px, side-by-side at tablet/desktop, no horizontal overflow at 320px

## 4. Static routes

- [x] 4.1 Change `app/page.tsx` to redirect to `/notes`
- [x] 4.2 Create placeholder pages: `notes`, `favorites`, `pinned`, `archive`, `trash`, `settings` under `app/(dashboard)/`
- [x] 4.3 Create placeholder `app/(dashboard)/notes/new/page.tsx` for New note action
- [x] 4.4 Add minimal empty-state copy on each page per Notely voice guidelines

## 5. Verification

- [x] 5.1 Verify theme toggle persists across refresh (light ↔ dark)
- [x] 5.2 Verify sidebar collapse persists across refresh on desktop
- [x] 5.3 Verify mobile drawer opens/closes and main content is usable at 320px width
- [x] 5.4 Verify all sidebar nav links route correctly and keyboard focus works on shell controls
- [x] 5.5 Run `npm run build` and fix any type or lint errors
