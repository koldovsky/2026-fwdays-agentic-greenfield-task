## Purpose

User-facing error-surfacing capability (C9): the SPA's voice for the domain error union established by C5 (`TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown | SessionNotConnected | validation`). Every command hook (`useSendKey`, `useVolume`, `useInputs.setInput`, `useDeviceSession.connect`) now catches its `ApiError`, pushes a toast via `useToast()` with domain-appropriate copy from `messageFor`, and re-throws. A `WsHealthChip` in each screen's header shows the `/ws` connection state (`Live` / `Reconnecting…` / `Offline`). An `ErrorBoundary` wraps `<App/>` as a last-resort backstop. All primitives use DS tokens only (raised surface, tone-tinted left band, no hex, no gradients on backgrounds).

## Requirements

### Requirement: Command failures produce a user-visible toast

Every user-initiated command that fails with an `ApiError` SHALL result in exactly one toast being shown, with English copy determined by the error's domain code. Covers `FR-ERROR-01`. Completes `FR-REMOTE-03`.

#### Scenario: Unreachable TV shows a friendly message

- **WHEN** the user presses a remote button and the back-end returns `code: "TvNotReachable"`
- **THEN** a toast appears with tone `error` and message "Can't reach the TV. Check that it's on and on the same network."

#### Scenario: Session-not-connected shows a warning

- **WHEN** the user presses a remote button while the session state is not `Connected` and the endpoint returns `409 SessionNotConnected`
- **THEN** a toast appears with tone `warning` and message "The TV isn't connected. Tap Connect to try again."

#### Scenario: No raw code shown to user

- **WHEN** the back-end returns any error envelope
- **THEN** the toast displays only human-readable text; the DOM does not contain any `"-32601"` / `"-32000"` / `"code:"` substrings

### Requirement: Toast auto-dismisses and is manually dismissable

Toasts SHALL auto-dismiss after 5 seconds. Hovering a toast SHALL pause its timer; leaving hover SHALL resume it. Every toast SHALL have a close button that dismisses it immediately.

#### Scenario: Timer auto-dismisses after 5 s

- **WHEN** a toast is pushed and the user does nothing
- **THEN** the toast is removed from the DOM within 5.5 seconds of appearance

#### Scenario: Hover pauses timer

- **WHEN** the user hovers a toast for 3 seconds and moves off
- **THEN** the toast is still present, and its remaining auto-dismiss budget (5 s minus the time already elapsed before the hover started) resumes from the mouse-leave moment

### Requirement: Toast host is capacity-bounded

At most 3 toasts SHALL be visible at once. On overflow, the oldest toast SHALL be dropped. Identical messages within 500 ms SHALL be de-duplicated.

#### Scenario: Fourth toast replaces the first

- **WHEN** a fourth toast is pushed while three are already visible
- **THEN** the DOM contains exactly three toasts, and the earliest one is gone

#### Scenario: Duplicate message de-duplicated

- **WHEN** two `push` calls with the exact same `message` arrive within 500 ms
- **THEN** only one toast is added to the DOM

### Requirement: WebSocket-health chip

Both the device-list screen and the remote screen SHALL show a compact chip in the header indicating the WebSocket connection health as one of `connected`, `reconnecting`, `offline`.

#### Scenario: Chip mirrors WebSocket state

- **WHEN** the `/ws` connection is healthy
- **THEN** the chip renders in the muted "connected" style with the label "Live"

#### Scenario: Chip shows reconnecting during backoff

- **WHEN** the WebSocket is in exponential-backoff reconnect
- **THEN** the chip switches to the `connecting`-styled state with the label "Reconnecting…"

### Requirement: Error boundary as a safety net

The SPA SHALL wrap its root in an `ErrorBoundary` that renders a DS-styled fallback screen with a "Try again" button on any uncaught render error.

#### Scenario: Uncaught render error shows fallback

- **WHEN** any component throws during render
- **THEN** the fallback screen renders with an `error_outline` Material Symbols icon and a "Try again" `Button` that reloads the page

### Requirement: Toast primitive is a proper DS extension

The `Toast` primitive SHALL live under `docs/orbit-tv-remote-design-system/components/feedback/Toast.jsx` alongside `Toast.d.ts` and `Toast.prompt.md`, follow the DS's neumorphic rules (raised surface, tokens only, no borders, no gradients on backgrounds), and be documented in `DESIGN.md`.

#### Scenario: Toast passes the DS lint sweep

- **WHEN** the change lands and the standard front-end grep guards run against the SPA
- **THEN** `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` returns nothing and the Toast primitive uses only `var(--…)` values in its source

#### Scenario: Toast primitive has a shim

- **WHEN** any file in `front-end/src` imports `Toast`
- **THEN** the import resolves via `@ds/components/feedback/Toast.jsx` and the corresponding `declare module` entry exists in `front-end/src/ds.d.ts`
