## 1. i18n strings

- [x] 1.1 Add `clockLabel` key to `lib/i18n/uk.ts` (value: `"Поточний час"`)
- [x] 1.2 Add `clockLabel` key to `lib/i18n/en.ts` (value: `"Current time"`)

## 2. TopClock component

- [x] 2.1 Create `components/top-clock/TopClock.tsx` as a `"use client"` component
- [x] 2.2 Implement `mounted` state guard (`useState(false)`) to suppress initial server render and avoid hydration mismatch
- [x] 2.3 Implement `useEffect` that starts a `setInterval` (1 000 ms) updating a `time` state string (HH:MM:SS, `Date` API) and clears the interval on unmount
- [x] 2.4 Render `null` when `!mounted`; render a `<time>` element with `dateTime` (ISO-8601) and `aria-label` (`clockLabel + ": " + time`) when mounted
- [x] 2.5 Apply design-system semantic tokens for typography and color (no raw ramps)

## 3. Shell integration

- [x] 3.1 Import and render `<TopClock />` in the header slot of `app/layout.tsx` (or the designated header region component)
- [x] 3.2 Verify the clock appears in the header on both mobile and desktop viewports

## 4. Tests

- [x] 4.1 Write a Vitest unit test that mocks `setInterval`/`clearInterval` and confirms the interval is started on mount and cleared on unmount
- [x] 4.2 Write a test that confirms the component renders `null` before mount (SSR output) and a `<time>` element after mount

## 5. Verification

- [x] 5.1 Run `npm run lint` — zero errors
- [x] 5.2 Run `npm run tsc` (or `next build` type-check) — zero type errors
- [x] 5.3 Run `npm run test` — all tests pass
- [x] 5.4 Open the app in a browser and confirm the clock ticks each second in the header
- [x] 5.5 Check browser dev-tools console for hydration warnings — none expected
- [x] 5.6 Run `npm run build` and verify total client JS bundle stays within the 200 KB gzipped budget (NFR-PERF-03)
