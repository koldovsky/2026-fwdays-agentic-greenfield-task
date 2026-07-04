## Context

Phase 1 (`app-foundation`) delivered `SiteHeader` with an optional `children` slot between the wordmark and theme toggle — intentionally reserved for the clock. DESIGN.md specifies header layout as `logo · clock · theme toggle` and typography as Geist Mono `text-sm` with `tabular-nums`.

FR-CLOCK-01 requires a live local-time clock updating every second without blocking core UI. The risk is a naive `setState` in a parent component causing full shell re-renders every second, which would eventually conflict with route input, map, and sidebar work.

Constraints: no external time APIs (NFR-COST-01, BC-PRIVACY-01), no new dependencies, Ukrainian accessibility copy via local i18n (NFR-I18N-01), silent console (NFR-OBS-01).

## Goals / Non-Goals

**Goals:**

- Display current local time in the header in `HH:MM:SS` (24-hour) format
- Update display every second with imperceptible impact on main content responsiveness
- Prevent layout shift when digits change (fixed-width mono display)
- Integrate via existing `SiteHeader` children slot without modifying shell structure
- Expose accessible labeling for screen readers (`aria-live` region)

**Non-Goals:**

- Timezone selection or travel-timezone display (always browser local time)
- Date, weekday, or locale-specific formatting beyond 24-hour clock
- Server-side time rendering or SSR of live values
- Sync with external NTP or geolocation-based timezone inference
- Header layout redesign (wordmark position, theme toggle)

## Decisions

### 1. Component location and composition

```
components/
  clock/
    header-clock.tsx   # "use client" — self-contained live clock
app/
  page.tsx             # <SiteHeader><HeaderClock /></SiteHeader>
```

**Rationale:** Isolating the clock in its own client boundary ensures only the clock subtree re-renders on tick. Parent server components (`AppShell`, `SiteHeader`) remain static.

**Alternative considered:** Lift clock state to a context provider — rejected; unnecessary shared state for a display-only widget.

### 2. Tick mechanism — `useSyncExternalStore` + `setInterval`

Subscribe to a module-level 1 s interval that notifies listeners. The clock component reads formatted time via `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.

```typescript
// Pattern sketch — not final code
function subscribe(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, 1000);
  return () => clearInterval(id);
}
function getSnapshot() {
  return formatTime(new Date());
}
function getServerSnapshot() {
  return formatTime(new Date()); // static placeholder at SSR; acceptable with suppressHydrationWarning
}
```

**Rationale:** Matches existing `ThemeProvider` pattern in the codebase. Single interval shared if multiple clock instances ever mount (only one expected). Avoids storing time in React state on a parent.

**Alternative considered:** `requestAnimationFrame` polling — rejected; 1 s granularity does not need rAF and wastes frames.

**Alternative considered:** `useEffect` + `setState` — acceptable for isolated component; `useSyncExternalStore` is slightly more efficient for external clock source and aligns with project conventions.

### 3. Time formatting

Use `Intl.DateTimeFormat` with `hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false` and `uk-UA` locale for consistent zero-padding, or manual `padStart` on local `Date` getters for zero dependency on Intl edge cases.

**Rationale:** Browser local time only; no network. `uk-UA` locale aligns with Ukrainian-first product without changing the numeric format.

### 4. Layout stability

Apply to the time `<time>` element:

- `font-mono text-sm tabular-nums text-muted-foreground`
- Fixed minimum width: `min-w-[5.5rem]` (fits `23:59:59`)
- `suppressHydrationWarning` on the element (SSR/client second mismatch is expected)

**Rationale:** DESIGN.md clock typography; prevents header jitter when seconds roll over.

### 5. Accessibility

- Wrap display in `<time dateTime={iso}>` with ISO 8601 `dateTime` attribute updated each tick
- `aria-live="off"` on the element (updates every second would be noisy with `polite`/`assertive`)
- Static Ukrainian `aria-label` from i18n: e.g. `clock.label` → "Поточний місцевий час"
- Clock is presentational in header — not focusable, no keyboard interaction

**Alternative considered:** `aria-live="polite"` — rejected; announcing every second is disruptive for screen reader users.

### 6. i18n additions

Add to `lib/i18n/uk.ts`:

```typescript
clock: {
  label: "Поточний місцевий час",
}
```

No exclamation marks (BC-BRAND-01).

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| SSR/hydration mismatch on seconds digit | `suppressHydrationWarning` on `<time>`; server snapshot uses render-time value |
| Interval leak on unmount | `useSyncExternalStore` cleanup clears interval when last subscriber unmounts (module-level ref count) |
| Header crowding on narrow mobile | Fixed `min-w` on clock; wordmark + clock + toggle already fit at ≥375 px with `gap-2` |
| Battery use from 1 s interval | Single lightweight interval; acceptable for MVP demo; no rAF loop |
| Tab background throttling slows ticks | Acceptable drift when tab inactive; clock resyncs on visibility return via next tick |

## Migration Plan

1. Add `components/clock/header-clock.tsx` and i18n key
2. Pass `<HeaderClock />` as `SiteHeader` child in `app/page.tsx`
3. Verify `npm run lint && npm run build`
4. Manual check: clock ticks, header width stable, theme toggle and main content unaffected

Rollback: remove clock component and child from page — header returns to Phase 1 appearance.

## Open Questions

- None blocking. Format locked to 24-hour `HH:MM:SS` per DESIGN.md metrics/clock convention.
