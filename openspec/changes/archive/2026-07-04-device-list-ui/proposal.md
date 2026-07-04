## Why

Capability **C4** (`docs/capabilities.md`) — `upnp-tv-discovery` now maintains a live registry, but nothing renders it. The device list is the SPA's landing screen and the entry point for every downstream user flow; without it, discovery is invisible and the "open mytv.local, see TVs" UX promise is broken.

`front-end/src/App.tsx` today renders the two-screen shell against a hard-coded `SAMPLE_DEVICES` array. This change swaps that stub for the real WebSocket-fed registry and finishes the device-list side of the SPA.

## What Changes

- Replace the sample-devices stub with a live subscription to the `/ws` `devices` topic (snapshot on connect, deltas thereafter).
- Fetch `GET /api/devices` as a REST fallback if the WebSocket has not delivered a snapshot within 500 ms (survives a lost initial connect).
- Render each device with the Orbit `DeviceCard` primitive (name, model, IP, status via `Badge`), showing `online | offline | connecting` states. `connecting` reserved for the state introduced by `tv-connection-lifecycle`; for now, the registry only produces `online | offline`.
- Empty state: DS-primitive-composed placeholder ("No TVs found. Make sure your TV is on the same Wi-Fi network.") — no illustration, no logo, matches the `DESIGN.md` "no imagery" rule.
- Offline TVs stay in the list, greyed via the DS's `offline` badge state; they remain clickable (the user gets a friendly failure on `tv-connection-lifecycle` — not this change's problem).
- No manual-add-by-IP button in this change — the FR does not exist yet (`docs/capabilities.md` gap). A follow-up change will add it once `requirements.md` grows the FR.

## Capabilities

### New Capabilities

- `device-list-ui`: SPA device-list screen bound to the live registry, using Orbit DS primitives only.

### Modified Capabilities

<!-- None — this is the first UI capability. platform-foundation's spec is not being modified; device-list-ui only consumes its contract. -->

## Impact

- **Requirements covered**: `FR-UI-01`, `FR-UI-02`, `FR-UI-03`, `FR-UI-04`, `FR-UI-05`. Contributes to `NFR-02`.
- **Depends on**: `upnp-tv-discovery` (needs the `/api/devices` snapshot and the `/ws` `devices` topic), `platform-foundation` (transport, error envelope, apiClient).
- **Code**: rewrites `front-end/src/App.tsx` (removes `SAMPLE_DEVICES`); adds `front-end/src/screens/DeviceListScreen.tsx`, `front-end/src/data/useDevices.ts` (WebSocket + REST hook), and if the `@ds/components/**` types shim needs to grow to cover any newly imported primitive, updates `front-end/src/ds.d.ts`.
- **Non-goals**: manual add-by-IP; opening a TV's remote (the click still fires `onOpenDevice`, but the `RemoteScreen` still uses stub data until `remote-control-keys` lands); reconnect UX for the WebSocket beyond "retry with backoff" (silent — no red banner); toast/error surfacing (belongs to `error-surfacing`).
- **Design rules applied**: DS primitives only (`DeviceCard`, `Badge`, `Button`, potentially `Card` for the empty state). Warm orange used exactly once — on the future "Add a TV" primary CTA slot (rendered as a disabled placeholder for now, per the missing FR gap). Copy in English, sentence-case, second-person ("Your TVs", "No TVs found"). Tokens only — no hard-coded palette.
