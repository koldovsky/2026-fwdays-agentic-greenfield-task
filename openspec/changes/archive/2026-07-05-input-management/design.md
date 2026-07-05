## Context

This change was originally drafted against Samsung's hotel-TV IP Control (JSON-RPC 2.0), which exposes `directSourceControl` for both listing available inputs and setting the active one. `smart-view-ws-transport` (archived 2026-07-04) pivoted the transport to Samsung's consumer **Smart View WebSocket** on port 8001, which is **remote-key-only** — there is no way to enumerate the TV's inputs, no way to read the active input, and no direct "set input to X" method. Ground truth for the on-wire envelope is `openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md` D1: a text frame `JSON.stringify({ method: 'ms.remote.control', params: { Cmd:'Click', DataOfCmd:<key>, Option:'false', TypeOfRemote:'SendRemoteKey' } })`.

What Smart View WS DOES expose: individual input-selection remote keys (`KEY_HDMI`, `KEY_HDMI1`..`KEY_HDMI4`, `KEY_TV`, `KEY_SOURCE`, and a handful of legacy AV/component variants). Some fire an immediate input jump; some just open the on-TV source picker. Behavior is model-dependent but the key vocabulary is stable across the Tizen 2016+ family this repo targets.

So the C8 scope on Smart View reality:

- **List inputs**: a curated static catalogue in `back-end/src/tv/inputs.ts`. Not read from the TV. `docs/capabilities.md` C8 already anticipates "rarely-changing data"; we take the extreme case where it's not just rarely-changing but literally static per install.
- **Set active input**: enqueue one `ms.remote.control` frame carrying the chosen input key.
- **Read active input**: not possible. `activeId` is not exposed on the wire.
- **Refresh**: no-op — nothing to fetch. Drop the endpoint.
- **WebSocket push after switch**: yes, so multiple SPA clients see each other's switches. The event carries the requested `key`; `activeId` is omitted because it's unknown.

`tv-connection-lifecycle` gives the per-TV session queue and error mapping. `remote-control-keys` (C6, archived) supplies `back-end/src/tv/keys.ts::keyControlParams(key)` — the same helper builds the wire envelope here so the shape stays canonical. `volume-control` (C7, archived) established the "static-list front-end module + optimistic tracker" pattern; C8 follows suit, minus the tracker (there is no local state — the input list is a constant and there is no active-input to track).

## Goals / Non-Goals

**Goals:**
- One tap in the SPA fires the correct Smart View input key on the TV.
- A curated list of the inputs common to Samsung Tizen 2016+ so the user can pick without navigating the on-TV menu.
- Modal auto-closes when the session leaves `Connected`.

**Non-Goals:**
- Reading the actual list of inputs from the TV (impossible over Smart View).
- Reading or displaying the currently-active input (impossible over Smart View).
- Refresh action (nothing to refresh; drop the endpoint entirely).
- Renaming inputs; deep-linking into apps; per-input scene automation.
- UPnP `AVTransport` / SmartThings integration for real listing / active-input — separate future capability if those matter.

## Decisions

### D1 — Endpoints (Smart View WS reality)

Two routes, UDN-scoped:

- `GET /api/devices/:udn/inputs` — returns the static catalogue `{ inputs: [{ id, label }] }`. Always the same list regardless of UDN (Samsung Tizen 2016+ share the same input keys). No cache — it's a constant. No `active` field on each row and no top-level `activeId` (unknowable on Smart View).
- `POST /api/devices/:udn/input { key }` — validates `key` against the static enum. On valid + `Connected` → enqueue one `ms.remote.control` frame via `session.enqueue`, emit `input` WebSocket event, respond `204`. On invalid `key` → `400 validation`. On non-Connected → `409 SessionNotConnected` (same code shape as C6/C7).

`POST /inputs/refresh` from the original design is dropped: nothing to refresh.

### D2 — Input catalogue

`SamsungInputKey` union in `back-end/src/tv/inputs.ts`:

```
'KEY_SOURCE'    // opens the on-TV source picker
'KEY_HDMI'      // some models jump; others cycle
'KEY_HDMI1' | 'KEY_HDMI2' | 'KEY_HDMI3' | 'KEY_HDMI4'
'KEY_TV'        // over-the-air tuner
'KEY_AV1'       // legacy composite
'KEY_COMPONENT1'
```

Every entry is a valid Samsung remote key that the TV accepts under `ms.remote.control`. `label` is a human-readable string ("HDMI 1", "TV Tuner", "Source Picker"). The catalogue is intentionally curated — not every KEY_* Samsung ever shipped (avoid a 40-row picker most users would ignore). Extending is a one-liner if we ever want more.

The `id` in the row is the same Samsung key string (used verbatim in the `POST /input` body). Keeps the wire shape uniform and lets the front-end pass the row's `id` straight through.

`SamsungInputKey` lives in a new file rather than being merged into `SamsungKeyCode` because the C6 `/key` route intentionally excludes control-only keys (its schema uses `SAMSUNG_KEY_CODES` — same pattern as C7 kept volume keys separate). The C8 input keys ARE physically the same `KEY_*` vocabulary as C6/C7, but the *route-visible* enum stays split by capability.

### D3 — WebSocket push

`{ topic: 'devices', event: 'input', udn, key }` — pushed after any successful `POST /input`. No `inputs` (they're a static constant available via `GET /inputs`) and no `activeId` (unknowable). Multiple SPA clients that see the event can visually flash the row that just fired if they want, but they cannot use it to update an active-input marker.

Initial push on `Connected`: no. There is nothing to snapshot — the input list is a constant known to every client already, and there is no active-input to report. Skipping this simplifies the broker.

### D4 — Front-end UX

- `RemoteScreen` gets a new `IconButton icon="input"` next to the back/home/menu row. Tapping opens `InputsModal`.
- `InputsModal` is composed from the DS `Modal` primitive with a vertical stack of rows, one per catalogue entry. Each row shows the `label` on the left; no active checkmark (no active-input state to compare against). Tapping a row fires `POST /input { key }` and closes the modal.
- No refresh button — no refresh endpoint. Header of the modal is just a title and close button (the DS `Modal` already provides the close).
- If the session state leaves `Connected` while the modal is open, it closes automatically. This gates against the case where the user opens the picker, the TV drops offline, and they tap a row — which would 409 anyway, but the auto-close is friendlier.
- No `activeId` prop on `useInputs`; the hook returns `{ inputs, setInput }` only.

### D5 — DS list-row primitive

The DS ships `Modal`, `IconButton`, `Card`. There is no dedicated "list row" primitive. Options:

1. Compose from DS `Card` per row. Cards are meant for larger surfaces; a tall stack of them would look wrong at scale.
2. Extend the DS with a new `ListRow` primitive (raised default, inset on press, room for label + right-side glyph). Consistent with the neomorphic pattern; reusable in future settings screens.

Choose (2) per `frontend-design-check` skill: extend the DS, do not inline the row style. New primitive lives at `docs/orbit-tv-remote-design-system/components/core/ListRow.{jsx,d.ts}` with props `{ label, onClick, disabled }`.

## Risks / Trade-offs

- **[Curated list may not match the user's actual TV inputs]** → The list shows more entries than a given TV actually uses. Tapping `KEY_HDMI4` on a TV without a fourth HDMI port is a no-op on the wire — the TV ignores it, no user-visible failure. Better than showing fewer entries than the TV has (which would strand real ports).
- **[No `activeId` in the UI]** → The picker doesn't highlight the current input. User can't tell at a glance what they're on. Acceptable for MVP; a future UPnP `AVTransport` integration could reconcile.
- **[`KEY_SOURCE` opens the on-TV source list instead of switching directly]** → Documented in the row label ("Source picker" rather than a specific input name). Acceptable — this is Samsung's own remote behaviour.
- **[Broker gains one more event type]** → Same additive shape as C7. Cost is negligible.

## Migration Plan

None. Rollback removes the "Inputs" button, the modal, and the new endpoints; nothing else regresses.

## Open Questions

- **Should we probe the TV once to detect which of the `KEY_HDMI*` variants it accepts and hide the ones it doesn't?** No safe probe exists — sending a key doesn't return a status. Deferred.
- **When we eventually add UPnP `AVTransport` for real listing / active read, do we replace this whole endpoint or layer it?** Deferred — depends on what UPnP reveals on real hardware.
