## 1. Pure helper

- [x] 1.1 Create `src/lib/paginate.ts` — export `paginate<T>(list: T[], page: number, pageSize: number): { items: T[]; totalPages: number }` (1-based page, clamps invalid input to page 1)

## 2. i18n strings

- [x] 2.1 Add `pagination` key to `src/lib/i18n/en.ts` with aria labels: `previous`, `next`, `page` (e.g. `"Page {{n}}"`)

## 3. Pagination feature component

- [x] 3.1 Create `src/components/features/Pagination.tsx` (`"use client"`) — reads `?page=` from current URL params via `useSearchParams`, calls `useRouter` to push `?page=N` while preserving all other params; renders the DS `Pagination` component with `page`, `totalPages`, and `onPageChange`

## 4. Update URL writers in client components

- [x] 4.1 In `src/components/features/FilterBar.tsx` — add `page: '1'` reset to every `pushParams` call that modifies type, gen, or legendary filters (do not reset when user presses Clear — that already removes all params)
- [x] 4.2 In `src/components/features/SearchBar.tsx` — add `page: '1'` reset to the debounced `router.push` call so any new search term lands on page 1

## 5. Wire page to the list page

- [x] 5.1 In `app/pokemon/page.tsx` — read `page` from `searchParams` (parse to int, default 1, clamp to `[1, totalPages]` with redirect when out of range); call `paginate(filteredIndex, page, 20)` to get the 20-item slice and `totalPages`; pass `page` and `totalPages` as props to the new `Pagination` component rendered below the card grid (hide `Pagination` when `totalPages <= 1`)

## 6. Verify

- [x] 6.1 Confirm `tsc --noEmit` passes with no errors
- [x] 6.2 Confirm `npm run build` succeeds
- [x] 6.3 Manually verify: browse to `/pokemon`, navigate to page 2, apply a type filter → drops to page 1, search → drops to page 1, clear filters → page 1, bookmark `/pokemon?page=2&type=fire` and reload → correct page and filter shown
