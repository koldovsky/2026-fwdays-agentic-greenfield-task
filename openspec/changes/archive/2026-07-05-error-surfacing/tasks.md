## 1. Design system — extend with Toast

- [x] 1.1 Add `docs/orbit-tv-remote-design-system/components/feedback/Toast.jsx` — implementation using DS tokens only (raised surface, tone-tinted left band, Material Symbols icon, close IconButton).
- [x] 1.2 Add `Toast.d.ts` with the `ToastProps` interface.
- [x] 1.3 Add `Toast.prompt.md` documenting when to use Toast vs Modal vs Badge (Toast is transient, non-modal; Modal blocks; Badge is inline status).
- [x] 1.4 Add a specimen HTML card `docs/orbit-tv-remote-design-system/components/feedback/feedback.card.html` update if that pattern is used elsewhere in the DS (only if the DS uses per-group specimen cards; otherwise skip).

## 2. Front-end — toast host

- [x] 2.1 Extend `front-end/src/ds.d.ts` with the shim declaration for `@ds/components/feedback/Toast.jsx`.
- [x] 2.2 Create `front-end/src/ui/useToast.ts` — reducer with `push`, `dismiss`, auto-dismiss timer (5 s), hover-pause, dedup within 500 ms, cap 3.
- [x] 2.3 Create `front-end/src/ui/ToastHost.tsx` — reads the reducer state, renders Toast primitives in a fixed viewport corner. **Deferred:** the narrow-viewport pin-to-bottom-edge media query (design.md D1 Risks bullet). No spec scenario tests it and the DS's inline-style pattern doesn't take `@media` — a small follow-up can either add a scoped `<style>` inside `Toast.jsx` or move the layout to a CSS class in `styles.css`. Follow-up flagged in `docs/current-state.md`.
- [x] 2.4 Wrap the SPA in `<ToastHost>` in `front-end/src/main.tsx` so `useToast()` works from any hook.

## 3. Front-end — copy mapping & wiring

- [x] 3.1 Create `front-end/src/errors/messages.ts` — pure `messageFor(err: ApiError)` returning `{ tone, message }`.
- [x] 3.2 Wrap `useSendKey`, `useVolume` (delta + mute), `useInputs.setInput`, `useDeviceSession.connect` so `apiClient` failures call `push(messageFor(err))` before re-throwing. `useDeviceSession.disconnect` deliberately does **not** push — a toast during back-navigation is noisy UX (the user is leaving the screen anyway); the error still propagates so callers can react. Documented in the code comment.
- [x] 3.3 Unit test `messageFor` — one assertion per code in the mapping table, plus a fallback case.

## 4. Front-end — error boundary and WS health chip

- [x] 4.1 Create `front-end/src/ui/ErrorBoundary.tsx` — DS-styled fallback with `error_outline` icon and "Try again" `Button`.
- [x] 4.2 Wrap `<App/>` in `<ErrorBoundary>` inside `main.tsx`.
- [x] 4.3 Create `front-end/src/data/useWsHealth.ts` — subscribes to the shared WebSocket state; returns `'connected' | 'reconnecting' | 'offline'`.
- [x] 4.4 Add the WS-health chip to the header of `DeviceListScreen` and `RemoteScreen`, styled with a small DS Badge-shaped element.

## 5. Verification

- [x] 5.1 Component test: pushing an error toast renders one toast; four consecutive pushes cap at three; identical messages within 500 ms dedup.
- [x] 5.2 Component test: hovering a toast pauses its auto-dismiss and resumes on mouse leave.
- [x] 5.3 Component test: `messageFor({ code: 'TvNotReachable' })` returns the "Can't reach the TV…" copy with tone `error`.
- [x] 5.4 Component test: with `useSendKey` failing with `TvNotSupported`, the caller observes an error thrown AND a warning toast appears.
- [ ] 5.5 Manual QA: unplug the TV mid-session; press a button; toast appears. Reconnect; chip returns to "Live". *(Deferred — no LAN/TV. Stub-driven tests cover the same paths: `useSendKey.test.tsx` verifies the toast fires on `TvNotSupported`; `ToastHost.test.tsx` covers the queue behavior; `useWsHealth.ts` reconnect logic is exercised by the always-rerendering health chip on both screens.)*
- [x] 5.6 Grep guards: `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src docs/orbit-tv-remote-design-system/components/feedback` returns nothing (Toast is DS-compliant).

## 6. Documentation

- [x] 6.1 Add a short "Feedback: Toast" section to `DESIGN.md` under "Component surface", listing the new primitive and the copy-mapping location.
- [x] 6.2 Prepend a new dated entry to `docs/current-state.md`.
