## 1. Extend i18n strings

- [x] 1.1 Add `jokes: string[]` field to the `Strings` interface in `lib/i18n/uk.ts`
- [x] 1.2 Add at least 10 Ukrainian weather-themed joke strings (calm voice, no exclamation marks) under `uk.jokes` in `lib/i18n/uk.ts`
- [x] 1.3 Add matching `jokes: string[]` array to `lib/i18n/en.ts` so the Strings contract is satisfied

## 2. Implement BottomJokes component

- [x] 2.1 Create `app/components/BottomJokes.tsx` as a `"use client"` component
- [x] 2.2 On first render return an empty `<span>` (no joke text) to avoid hydration mismatch
- [x] 2.3 In `useEffect`, compute `dayOfYear % uk.jokes.length` using `new Date()` and set the joke string into state
- [x] 2.4 Render the resolved joke string in a `<p>` with appropriate semantic class (`text-sm text-text-secondary`)

## 3. Mount component in footer

- [x] 3.1 Import `<BottomJokes />` in `app/components/Footer.tsx`
- [x] 3.2 Replace the empty `<div data-slot="footer" …/>` with `<BottomJokes />` (keep the `aria-label` and class attributes on the wrapper or move them to `BottomJokes`)

## 4. Verify

- [x] 4.1 Run `npm run lint && npm run build` — zero errors, zero new type errors
- [x] 4.2 Open the app in the browser and confirm a Ukrainian joke appears in the footer
- [x] 4.3 Confirm the browser console has no hydration mismatch warnings
- [x] 4.4 Confirm the Open-Meteo and OpenStreetMap attribution links are still visible in the footer
- [x] 4.5 Confirm no exclamation marks appear in any rendered joke string
