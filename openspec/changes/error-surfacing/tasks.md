## 1. Design system — extend with Toast

- [ ] 1.1 Add `docs/orbit-tv-remote-design-system/components/feedback/Toast.jsx` — implementation using DS tokens only (raised surface, tone-tinted left band, Material Symbols icon, close IconButton).
- [ ] 1.2 Add `Toast.d.ts` with the `ToastProps` interface.
- [ ] 1.3 Add `Toast.prompt.md` documenting when to use Toast vs Modal vs Badge (Toast is transient, non-modal; Modal blocks; Badge is inline status).
- [ ] 1.4 Add a specimen HTML card `docs/orbit-tv-remote-design-system/components/feedback/feedback.card.html` update if that pattern is used elsewhere in the DS (only if the DS uses per-group specimen cards; otherwise skip).

## 2. Front-end — toast host

- [ ] 2.1 Extend `front-end/src/ds.d.ts` with the shim declaration for `@ds/components/feedback/Toast.jsx`.
- [ ] 2.2 Create `front-end/src/ui/useToast.ts` — reducer with `push`, `dismiss`, auto-dismiss timer (5 s), hover-pause, dedup within 500 ms, cap 3.
- [ ] 2.3 Create `front-end/src/ui/ToastHost.tsx` — reads the reducer state, renders Toast primitives in a fixed viewport corner; media-query pin to bottom edge on narrow viewports (inside the DS primitive, not here).
- [ ] 2.4 Wrap the SPA in `<ToastHost>` in `front-end/src/main.tsx` so `useToast()` works from any hook.

## 3. Front-end — copy mapping & wiring

- [ ] 3.1 Create `front-end/src/errors/messages.ts` — pure `messageFor(err: ApiError)` returning `{ tone, message }`.
- [ ] 3.2 Wrap `useSendKey`, `useVolume`, `useInputs`, `useDeviceSession` so `apiClient` failures call `push(messageFor(err))` before re-throwing.
- [ ] 3.3 Unit test `messageFor` — one assertion per code in the mapping table, plus a fallback case.

## 4. Front-end — error boundary and WS health chip

- [ ] 4.1 Create `front-end/src/ui/ErrorBoundary.tsx` — DS-styled fallback with `error_outline` icon and "Try again" `Button`.
- [ ] 4.2 Wrap `<App/>` in `<ErrorBoundary>` inside `main.tsx`.
- [ ] 4.3 Create `front-end/src/data/useWsHealth.ts` — subscribes to the shared WebSocket state; returns `'connected' | 'reconnecting' | 'offline'`.
- [ ] 4.4 Add the WS-health chip to the header of `DeviceListScreen` and `RemoteScreen`, styled with a small DS Badge-shaped element.

## 5. Verification

- [ ] 5.1 Component test: pushing an error toast renders one toast; four consecutive pushes cap at three; identical messages within 500 ms dedup.
- [ ] 5.2 Component test: hovering a toast pauses its auto-dismiss and resumes on mouse leave.
- [ ] 5.3 Component test: `messageFor({ code: 'TvNotReachable' })` returns the "Can't reach the TV…" copy with tone `error`.
- [ ] 5.4 Component test: with `useSendKey` failing with `TvNotSupported`, the caller observes an error thrown AND a warning toast appears.
- [ ] 5.5 Manual QA: unplug the TV mid-session; press a button; toast appears. Reconnect; chip returns to "Live".
- [ ] 5.6 Grep guards: `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src docs/orbit-tv-remote-design-system/components/feedback` returns nothing (Toast is DS-compliant).

## 6. Documentation

- [ ] 6.1 Add a short "Feedback: Toast" section to `DESIGN.md` under "Component surface", listing the new primitive and the copy-mapping location.
- [ ] 6.2 Prepend a new dated entry to `docs/current-state.md`.
