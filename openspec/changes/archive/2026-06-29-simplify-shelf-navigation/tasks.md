## 1. Implementation

- [x] 1.1 Make `components/BookSpine.tsx` a `next/link` to `/book/<slug>` (remove the click/onSelect modal trigger); add "Open book" / "Add note" links to the hover preview
- [x] 1.2 Simplify `components/ShelfClient.tsx` — no client state, no modal (renders shelves of spines)
- [x] 1.3 Remove `components/BookPopup.tsx`
- [x] 1.4 Update `app/globals.css` (`.bs-spine` as anchor; preview actions + hover bridge so the preview is reachable/clickable)
- [x] 1.5 Update `components/spine.test.tsx` and `components/shelf-client.test.tsx`

## 2. Verify

- [x] 2.1 `npm test` (62) green; `npx tsc --noEmit` clean; `npm run build` green
- [x] 2.2 Playwright: clicking a spine navigates to `/book/<slug>` in BOTH Chromium and WebKit (Safari engine), no console errors
