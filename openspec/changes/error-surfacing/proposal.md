## Why

Capability **C9** (`docs/capabilities.md`) — up to this point every command capability has logged failures to the browser console and let the disabled state carry the visual load. That is fine during development but user-hostile in production: a user pressing "Home" and getting silence has no idea whether the request went out or not.

This change is the coverage sweep: introduce a single toast/banner UI pattern and route every `ApiError` from every command hook through it, without the command hooks themselves knowing about UI. It closes `FR-ERROR-01` (user-facing error surfacing) and rounds out `FR-REMOTE-03` (success/failure feedback for commands).

Positioned in Phase 4 because it can be started early as a stub (during `platform-foundation`) and hardened here once every command capability has a real error path to feed it.

## What Changes

- Introduce a top-level `<ErrorBoundary>` inside the SPA's shell that catches uncaught render errors and shows a fallback screen composed from DS primitives.
- Introduce a lightweight `useToast()` API and a `<ToastHost>` component composed from an extended DS primitive (a Toast — DS does not ship one, so we add it via the `frontend-design-check` skill process). Toast supports three tones: `info | warning | error`; auto-dismisses at 5 s; keyboard-accessible.
- Wire every command hook (`useSendKey`, `useVolume`, `useInputs`, `useDeviceSession`) to feed friendly messages into `useToast()`. The mapping from domain codes to friendly copy lives in one place: `front-end/src/errors/messages.ts`.
- Copy pass in English, sentence-case, second-person, per the DS content rules:
  - `TvNotReachable` → "Can't reach the TV. Check that it's on and on the same network."
  - `TvNotSupported` → "Your TV doesn't support this action."
  - `TvFailed` → "The TV didn't like that. Try again in a moment."
  - `TvInvalidOp` → "Something's off with that request." (should be an internal bug — log at `warn` on the front-end)
  - `TvUnknown` → "Unexpected TV response. If this keeps happening, check the back-end log."
  - `SessionNotConnected` → "The TV isn't connected. Tap Connect to try again."
  - `validation` → "That value isn't allowed here." (internal — surface only in dev builds)
  - Generic 5xx → "The remote service had a hiccup. Please try again."
- WebSocket-disconnect banner: a compact chip in the header of both screens indicates when the `/ws` connection is unhealthy — small, informational, not modal. Retries continue silently under the hood.

## Capabilities

### New Capabilities

- `error-surfacing`: toast host + error-copy mapping + WebSocket-disconnect chip + error boundary, all composed from DS primitives (extending the DS with a `Toast` primitive as part of the change).

### Modified Capabilities

<!-- None. Every command capability's hook is edited to call the new toast API, but their public HTTP + WebSocket contracts stay the same. -->

## Impact

- **Requirements covered**: `FR-ERROR-01`. Completes `FR-REMOTE-03` (success/failure surfacing to the user).
- **Depends on**: `remote-control-keys`, `volume-control`, `input-management`, and `tv-connection-lifecycle`. This change assumes every hook that can throw an `ApiError` has been wired to a UI feature.
- **Code**: extends the DS with `Toast` (and its `.jsx`, `.d.ts`, `.prompt.md`) — proper DS extension per `frontend-design-check`. Adds `front-end/src/ui/ToastHost.tsx`, `front-end/src/ui/useToast.ts`, `front-end/src/errors/messages.ts`, `front-end/src/ui/ErrorBoundary.tsx`. Edits every command hook to route errors through the toast.
- **Non-goals**: retry-with-backoff on failed commands (users can just tap again); error analytics / telemetry (`BC-05` no cloud, no analytics); localisation — the DS mandates English, so the copy stays English.
