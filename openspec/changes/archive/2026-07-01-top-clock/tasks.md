## 1. i18n

- [x] 1.1 Add `clock.label` string to `lib/i18n/uk.ts` ("Поточний місцевий час", no exclamation marks)
- [x] 1.2 Verify typed `t("clock.label")` resolves via existing `lib/i18n/index.ts`

## 2. Clock module

- [x] 2.1 Create `lib/clock/format-local-time.ts` — format `Date` as `HH:MM:SS` 24-hour local time and ISO 8601 `dateTime` string
- [x] 2.2 Create `lib/clock/time-store.ts` — module-level 1 s interval with subscribe/getSnapshot for `useSyncExternalStore` (ref-count subscribers)
- [x] 2.3 Implement `components/clock/header-clock.tsx` client component — `<time>` with Geist Mono, `tabular-nums`, `min-w-[5.5rem]`, `suppressHydrationWarning`, Ukrainian `aria-label`

## 3. Header integration

- [x] 3.1 Pass `<HeaderClock />` as `SiteHeader` child in `app/page.tsx` (between wordmark area and theme toggle)
- [x] 3.2 Confirm header layout at 375 px, 768 px, 1280 px — no horizontal overflow or layout shift on tick

## 4. Verification

- [x] 4.1 Run `npm run lint && npm run build` — must pass without errors
- [x] 4.2 Manual check: clock updates every second; theme toggle works; main empty state does not flicker
- [x] 4.3 Confirm no network time requests, no console output, no new dependencies (FR-CLOCK-01, BC-PRIVACY-01, NFR-OBS-01)
