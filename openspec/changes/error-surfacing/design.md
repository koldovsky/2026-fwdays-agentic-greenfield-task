## Context

By this point every command hook throws `ApiError` on failure and does nothing UI-level with it. The DS ships `Badge`, `Modal`, and `Card` — but no `Toast`. Neumorphic design constrains what a Toast can look like: single flat surface, raised shadow, no borders, no glass, no gradients. See `DESIGN.md` and the `frontend-design-check` skill for the full rule set.

`AGENTS.md` house rules apply: never leak raw `-32xxx`; map through the domain union; log with `correlationId` for correlation. The Toast is a UI concern only — logs are unchanged.

## Goals / Non-Goals

**Goals:**
- Every user-triggered failure produces one visible toast, with English copy and a domain-appropriate tone.
- No hook or screen needs to know how a toast is rendered — one `useToast()` API.
- New DS Toast primitive that respects neumorphism (raised surface, one accent used sparingly, Material Symbols icon, Montserrat).
- Compact WebSocket-health chip so the user sees "we're catching up" without a modal.
- ErrorBoundary as a last-resort backstop.

**Non-Goals:**
- Per-error retry buttons in the toast. First MVP: dismissable, no action button. If a command fails, the user re-taps.
- Multiple concurrent toasts as a stack (support ≤3 stacked in the corner; further messages replace the oldest).
- Localised copy — English only per DS.
- Any telemetry pipeline.

## Decisions

### D1 — Extend the DS with `Toast`

Per the `frontend-design-check` gate: missing primitive → extend the DS, do not inline styles.

- Add `docs/orbit-tv-remote-design-system/components/feedback/Toast.jsx`, `.d.ts`, `.prompt.md`.
- Props: `{ tone: 'info' | 'warning' | 'error'; icon?: string; children: ReactNode; onDismiss?: () => void }`.
- Visual: `--nm-raised-md`, `--radius-md`, `--space-4` padding, tinted-wash left band per tone using the same tokens `Badge` uses (`--online`, `--connecting`, `--offline`). Material Symbols icon at the left. No border, no gradient background. Dismiss via a small `IconButton icon="close" size="sm"` on the right.
- Layout: renders inside a `<ToastHost>` fixed to the bottom-right of the viewport, offset with `--space-8` from both edges, `min-width: 280px`, `max-width: 420px`. Stacks vertically with `--space-3` gap.

### D2 — `useToast()` API

Zero-config for callers:

```
const { push } = useToast();
push({ tone: 'error', message: '...' });
```

Backed by a React context provided at the SPA root by `<ToastHost>`. Internally: `useReducer` state with `enqueue`, `dismiss`, auto-dismiss timer per toast (5 s). Reducer caps the queue at 3 — oldest dropped on overflow.

### D3 — Central error-copy mapping

`front-end/src/errors/messages.ts` exports a pure function:

```
messageFor(err: ApiError): { tone: ToneOf<Toast>, message: string }
```

Switch on `err.code`:

| `code`               | tone     | English message                                                              |
| -------------------- | -------- | ---------------------------------------------------------------------------- |
| `TvNotReachable`     | error    | Can't reach the TV. Check that it's on and on the same network.              |
| `TvNotSupported`     | warning  | Your TV doesn't support this action.                                         |
| `TvFailed`           | error    | The TV didn't like that. Try again in a moment.                              |
| `TvInvalidOp`        | error    | Something's off with that request.                                           |
| `TvUnknown`          | warning  | Unexpected TV response. If this keeps happening, check the back-end log.     |
| `SessionNotConnected`| warning  | The TV isn't connected. Tap Connect to try again.                            |
| `validation`         | error    | That value isn't allowed here.                                               |
| any other            | error    | The remote service had a hiccup. Please try again.                           |

One place to change copy; testable in isolation.

### D4 — Hook wiring

Every command hook (`useSendKey`, `useVolume` set/delta/mute, `useInputs` refresh/setInput, `useDeviceSession` connect/disconnect) wraps its `apiClient` call:

```
try { await …; }
catch (err) {
  if (err instanceof ApiError) push(messageFor(err));
  else push({ tone: 'error', message: 'Something went wrong.' });
  throw err;  // still throw — callers may want to know
}
```

Hooks never render a toast; they call `push()`. This keeps rendering and error surfacing decoupled.

### D5 — WebSocket-health chip

`useWsHealth()` returns `'connected' | 'reconnecting' | 'offline'` from the same WebSocket connection the `useDevices` hook manages. A small `Badge`-shaped chip in each screen's header shows the state — muted grey when connected, connecting-amber during reconnect, offline-red when we've given up. Text: "Live" / "Reconnecting…" / "Offline". Sub-modal; sub-toast.

### D6 — `ErrorBoundary`

`front-end/src/ui/ErrorBoundary.tsx` wraps `<App/>` in `main.tsx`. Fallback screen composed from DS `Card` + Material Symbols `error_outline` + a "Try again" `Button` that calls `window.location.reload()`. Logs the error to the console with the component stack. Not user-triggerable in normal operation; safety net.

## Risks / Trade-offs

- [Toast placement clashes with the D-pad's bottom-right area on tiny viewports] → Media query in the DS primitive: on viewports narrower than 480 px, toast pins to the bottom edge full-width. Standard practice; still no ad-hoc CSS in the SPA.
- [Toast auto-dismiss steals a user's ability to read a long error] → Hovering a toast pauses its timer; the reducer supports `pause(id)` / `resume(id)`.
- [Toast + modal overlap] → Toast host has a higher z-index than DS Modal's scrim; the toast is dismissable independently. Verified by the DS `Modal` z-index token.
- [Multiple simultaneous failed commands produce noisy stacks] → Cap at 3, oldest dropped. Also dedupe identical messages within 500 ms (the reducer suppresses the second `push` with an identical `message` string).

## Migration Plan

None — this is a UX pass, not a data change. Rollback removes the toast host, the ErrorBoundary, and reverts the hook wrappers back to `throw`.

## Open Questions

- Should the toast expose an `action` slot (a small button to open the RemoteScreen from the list, for example)? Deferred; MVP is dismiss-only, and every command capability's UI already provides a natural retry gesture.
