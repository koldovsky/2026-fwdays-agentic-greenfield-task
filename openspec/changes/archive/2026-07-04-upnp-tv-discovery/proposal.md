## Why

Capability **C3** (`docs/capabilities.md`) — the whole product hinges on TVs appearing in the UI without configuration. Without automatic UPnP discovery the user has to type IP addresses by hand, which is fine as a fallback but a poor "zero-configuration" primary flow (see product-brief "Product vision"). This change is the first back-end capability that actually talks to real TVs on the LAN.

Discovery must be stable across LAN churn: TVs coming and going, IP leases changing, duplicate SSDP replies. The stable identity is the UPnP `UDN` (per `AGENTS.md` house rules), not the IP address — otherwise a lease renewal creates ghost duplicates in the list.

## What Changes

- Introduce a UPnP discovery service inside the back-end that runs on process start and continuously updates a device registry.
- SSDP M-SEARCH (`ssdp:all` or Samsung-specific target) on a **30-second cadence** (`FR-DISCOVERY-03`) with a listener for asynchronous `NOTIFY` messages so joins register immediately.
- For each SSDP hit, fetch the device description XML from the advertised `LOCATION` URL; extract `UDN`, `friendlyName`, `modelName`, `modelNumber`, `manufacturer`. **Filter to Samsung TVs only** (`BC-02`) using the `manufacturer` field.
- Registry keyed by `UDN`; each entry stores `{ udn, name, model, ip, port, lastSeen, status }`. De-duplicate on `UDN` (`FR-DISCOVERY-05`). Mark a TV `offline` when `lastSeen` is older than 2 × the discovery interval (`FR-DISCOVERY-04`).
- Expose an HTTP endpoint `GET /api/devices` returning the current registry snapshot, and push add/update/remove deltas over the `/ws` WebSocket channel introduced by `platform-foundation`.
- No UI changes — that is `device-list-ui`.

## Capabilities

### New Capabilities

- `upnp-tv-discovery`: continuously discover Samsung TVs on the LAN, expose the registry snapshot over HTTP, and push deltas over the WebSocket.

### Modified Capabilities

<!-- None — pure ADDED. The WebSocket message shape is introduced here for the first time. -->

## Impact

- **Requirements covered**: `FR-DISCOVERY-01`, `FR-DISCOVERY-02`, `FR-DISCOVERY-03`, `FR-DISCOVERY-04`, `FR-DISCOVERY-05`. Also contributes to `BC-02` (Samsung-only filter).
- **Depends on**: `platform-foundation` (logger with `AccessToken` redaction — the SSDP path never sees a token but we still route logs through the shared logger; error envelope; WebSocket mount). `mdns-advertisement` is NOT a prereq — discovery works independently of how the SPA is reached.
- **Code**: adds `back-end/src/discovery/ssdp.ts`, `back-end/src/discovery/registry.ts`, `back-end/src/discovery/description.ts`, `back-end/src/routes/devices.ts`; wires start into `back-end/src/app.ts`; adds a WebSocket topic `devices`.
- **Dependencies added**: `node-ssdp` (or a hand-rolled UDP client — decided in design). No TV protocol dep yet (JSON-RPC comes with `tv-connection-lifecycle`).
- **Non-goals**: pairing / AccessToken handshake (belongs to `tv-connection-lifecycle`); manual add-by-IP (product brief mentions it but there is no FR yet — see the gap flagged in `docs/capabilities.md`); non-Samsung televisions (`BC-02`); browsing Chromecast, DLNA, or other UPnP device classes.
