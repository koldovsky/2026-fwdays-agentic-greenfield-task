## Context

The app-shell header has a named slot for a clock widget (FR-SHELL-01). This design covers mounting a live local-time clock into that slot as a `"use client"` Next.js component. The clock must not cause a hydration mismatch (the server and client would render different times), must be accessible, and must stay well under the NFR-PERF-03 bundle budget.

## Goals / Non-Goals

**Goals:**

- Render the user's local time (HH:MM:SS, 24-hour) in the header slot.
- Update the display once per second using `setInterval`.
- Expose an accessible label (updated on each tick) so screen readers can announce the time.
- Source all user-facing strings from `lib/i18n/uk.ts` / `en.ts` (NFR-I18N-01).
- Add zero new third-party dependencies.

**Non-Goals:**

- Timezone conversion or city-relative time (that belongs to the `forecast` capability).
- AM/PM display — 24-hour only per the Ukrainian-first UX.
- Persisting the time to URL state or any server-side rendering of the live value.

## Decisions

### Suppress initial render to avoid hydration mismatch

**Decision:** Mount the clock only after the first client render using a `mounted` state flag initialized to `false`; render `null` on the server and on the first client pass, then show the live time after mount.

**Rationale:** The server and the client will always disagree on the current time. Rendering the same value on both sides (e.g., an empty string) produces a harmless but noisy hydration warning in dev; rendering different values silently corrupts HTML. The `mounted` flag is the standard Next.js `"use client"` pattern for DOM-only values.

**Alternatives considered:**

- `suppressHydrationWarning` on the time element — suppresses the warning but does not prevent the DOM patch; flickering may occur on slow devices.
- `dynamic(() => import('./TopClock'), { ssr: false })` — equally valid; chosen not to use it here to keep the import simple, since `mounted` achieves the same effect without a dynamic boundary.

### `setInterval` cleanup on unmount

**Decision:** Return a cleanup function from `useEffect` that calls `clearInterval`.

**Rationale:** Without cleanup the interval fires after unmount, causing a React state update on an unmounted component (console warning) and a minor memory leak. Standard React pattern.

### Accessible label strategy

**Decision:** Wrap the time in a `<time>` element with a `dateTime` attribute (ISO-8601) and an `aria-label` that combines the i18n prefix with the formatted time string. The `aria-label` is updated every second alongside the display value.

**Rationale:** `<time>` is the semantically correct element; `aria-label` overrides the inner text for assistive technology, allowing us to provide a natural-language phrasing ("Поточний час: 14:32:07") without changing what's visually displayed.

### i18n string placement

**Decision:** The label prefix ("Поточний час" / "Current time") lives in `lib/i18n/uk.ts` and `lib/i18n/en.ts`. The component imports from a thin `useLocale` hook (or directly from the relevant file for MVP) rather than duplicating strings.

**Rationale:** BC-BRAND-01 and NFR-I18N-01 require all user-facing copy to route through `lib/i18n/`. Keeps the component free of hard-coded strings.

## Risks / Trade-offs

- **1-second re-render cost** → Mitigation: re-render is confined to `TopClock`; no parent re-renders. `useState` update is a single string diff — negligible cost.
- **Screen-reader verbosity** (aria-label updated every second) → Mitigation: `<time>` elements inside non-live regions are not announced on every change; only navigated-to content is read. No `aria-live` attribute will be added; screen readers poll rather than react to every tick.
- **Server/client time skew** (mounted guard leaves an empty slot for ~1 render frame) → Mitigation: the slot occupies reserved space in the header layout so no layout shift occurs; the clock appears within one animation frame after hydration.
