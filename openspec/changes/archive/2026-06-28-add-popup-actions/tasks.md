## 1. Implementation

- [x] 1.1 Add a primary "＋ Add note" button (→ `/book/<slug>/notes/new`) and make the title a link in `components/BookPopup.tsx`; keep "Open book" as secondary
- [x] 1.2 Update `components/spine.test.tsx` to assert both the Add-note and Open-book links

## 2. Verify

- [x] 2.1 `npm test` green; `npx tsc --noEmit` clean; `npm run build` green
- [x] 2.2 Playwright: from the popup, "Add note" navigates to `/book/<slug>/notes/new` and the note editor loads
