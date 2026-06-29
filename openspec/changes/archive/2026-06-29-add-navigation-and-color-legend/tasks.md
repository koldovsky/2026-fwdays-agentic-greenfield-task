## 1. Breadcrumbs

- [x] 1.1 Add `components/Breadcrumbs.tsx` (links all but the current crumb; `aria-current` on the last) + test
- [x] 1.2 Add breadcrumbs to book page, book new/edit, and note new/edit pages

## 2. Color legend

- [x] 2.1 Add a highlighter color-meaning legend to `components/NoteForm.tsx` (selected color emphasized) + test

## 3. Verify

- [x] 3.1 `npm test` (64) green; `npx tsc --noEmit` clean; `npm run build` green
- [x] 3.2 Playwright: note editor shows breadcrumb "The shelf / <Book> / Add note" and an 8-item legend
