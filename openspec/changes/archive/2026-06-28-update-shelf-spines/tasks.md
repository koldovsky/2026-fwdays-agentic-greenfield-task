## 1. Shared cover helper

- [x] 1.1 Add `components/cover.ts` exporting `coverGradient(color)` (the cover-color → CSS gradient map, default `ink`)

## 2. Spine + popup components

- [x] 2.1 Write failing tests `components/spine.test.tsx`: BookSpine shows title+author and calls onClick; BookPopup shows summary + Open-book link + close
- [x] 2.2 Implement `components/BookSpine.tsx` (vertical text, coverGradient bg, deterministic height by slug hash, `bs-spine` class, onClick)
- [x] 2.3 Implement `components/BookPopup.tsx` (scrim + dialog: cover/coverColor, title, author, Rating, status, tags, summary, Open-book link; close on scrim/✕/Escape)
- [x] 2.4 Run `npx vitest run components/spine.test.tsx` — green

## 3. Interactive shelf

- [x] 3.1 Write failing test `components/shelf-client.test.tsx`: clicking a spine opens the popup for that book; closing hides it
- [x] 3.2 Implement `components/ShelfClient.tsx` (`'use client'`, useState active book, renders tag shelves of BookSpine + BookPopup)
- [x] 3.3 Run `npx vitest run components/shelf-client.test.tsx` — green

## 4. Wire the page + styles

- [x] 4.1 Rewrite `app/page.tsx` to load + group books (server) and render `ShelfClient`
- [x] 4.2 Add spine/shelf styles to `app/globals.css` (`.bs-spine` hover highlight, shelf board)
- [x] 4.3 Remove `components/BookCardLink.tsx`, `components/TagShelf.tsx`, `components/shelf.test.tsx`

## 5. Verify

- [x] 5.1 `npm test` — all green
- [x] 5.2 `npx tsc --noEmit` — clean
- [x] 5.3 `npm run build` — green
- [x] 5.4 Manually verify: `npm run dev`, shelf shows spines; hover highlights; click opens popup with summary + cover + Open-book link
