## Context

Samsung IP Control's `directSourceControl` covers listing available inputs and setting the active one. Exact param shape lives in the `samsung-ip-control-protocol` skill; do not re-derive. `tv-connection-lifecycle` supplies the session queue and error mapping. The Orbit DS ships `Modal`, `IconButton`, and a Card primitive suitable for the picker rows — pick from `docs/orbit-tv-remote-design-system/components/**` and stay within the DS token vocabulary.

## Goals / Non-Goals

**Goals:**
- Cheap-to-use picker: one tap to open, one tap to switch.
- Server-cached input list so opening the picker feels instant.
- Explicit refresh gesture — power users can force-refresh if they plug in a new console.

**Non-Goals:**
- Live push of input changes made from the physical remote — MVP does not subscribe to unsolicited pushes. The picker refreshes on open.
- Input renaming or reordering.
- Deep-linking into apps (that is app launching, product brief "Future scope").

## Decisions

### D1 — Endpoints

Three routes, all UDN-scoped:

- `GET /inputs` — reads from an in-memory cache per session. If cache is empty (never fetched), falls back to a fresh read from the TV.
- `POST /inputs/refresh` — always hits the TV and refreshes the cache.
- `POST /input { id }` — validates that `id` is in the current cache; if not, refresh once and re-check; if still not, `400 validation`. Dispatches `directSourceControl` set. On success, re-reads and pushes a `input` WebSocket event.

Rejecting an unknown `id` server-side prevents the front-end from ever asking for an input the TV does not expose.

### D2 — Input shape

`{ id: string, label: string, active: boolean }`. `id` is whatever the TV returns (e.g. `"HDMI1"`, `"TV"`); we do not remap. `label` is the TV's own display name (`"Xbox"`, `"Living TV"`). `active` mirrors `activeId` for convenience.

### D3 — Front-end UX

- `RemoteScreen` gets a new `IconButton icon="input"` next to the transport row. Tapping opens `InputsModal`.
- `InputsModal` is composed from the DS `Modal` primitive. Its body is a vertical stack of DS-styled rows (extend the DS with an `InputListItem` primitive if a nice one is missing; do not inline the row style). Each row shows the label, a mono-font `id` on the right, and an active check icon on the current source.
- Header of the modal has a right-side refresh `IconButton icon="refresh"` that fires `POST /inputs/refresh` and updates the list.
- Modal disables selection while `state !== 'Connected'`. If the state falls out of `Connected` while the modal is open, it closes.

### D4 — Cache invalidation

The cache lives on the session actor from `tv-connection-lifecycle` — one map slot: `inputs: { activeId, list, fetchedAt }`. Invalidated when:

- Session transitions to `Connected` (fresh fetch on connect).
- User calls `POST /inputs/refresh`.
- User calls `POST /input { id }` — after the switch, re-read and update `active`.

If the TV emits an unsolicited source change (some models do), MVP misses it until the next explicit refresh. Accepted trade-off.

## Risks / Trade-offs

- [Some TVs return the same `id` for different inputs (`"AV"` for two composite ports)] → We show them both; `directSourceControl` disambiguates via a numeric index that the skill covers. If we hit that in the field, extend the mapping in `back-end/src/tv/inputs.ts`.
- [Refresh spam if the user leaves the modal open and taps refresh repeatedly] → No debounce; per-TV queue serializes anyway. The TV shrugs.
- [Modal focus trap in the DS?] → Verify the DS `Modal` primitive traps focus and returns it on close; if not, extend the DS (per `frontend-design-check`).

## Migration Plan

None. Rollback removes the "Inputs" button and the modal; nothing else regresses.

## Open Questions

- Should the picker also show icons per input (HDMI logo, TV antenna, etc.)? Deferred — Material Symbols Rounded has generic glyphs but no HDMI mark; matching per-model iconography is scope-creep for MVP.
