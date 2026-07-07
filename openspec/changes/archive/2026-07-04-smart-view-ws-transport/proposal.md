## Why

The live-TV smoke of the just-archived `tv-connection-lifecycle` (C5) against the implementer's Samsung UE40KU6000 exposed three tightly-related problems that the current specs can't cover, so the whole slice stops at `Connecting → Disconnected` on real hardware:

1. **Wrong protocol for consumer TVs.** `tv-connection-lifecycle`'s design commits to Samsung's **hotel-TV IP Control** protocol (JSON-RPC 2.0 over HTTPS on 1515/1516, per `docs/samsung-ip-control-protocol/HTV_IPControl_Protocol_20251120_v.2.8.pdf` and the `samsung-ip-control-protocol` skill). Consumer Tizen TVs (2016+) do NOT speak that. They speak the **Samsung Smart View WebSocket API on port 8001** — plain WebSocket, name-based pairing via a Base64 `name` query param, message envelope `{ method: "ms.remote.control", params: { Cmd, DataOfCmd, Option, TypeOfCode } }`. Switching only the port (1515/1516 → 8001) would still fail because `undici.Pool` can't complete a TLS handshake against a plain WebSocket. The transport layer needs to be replaced, not tuned.

2. **Discovery over-counts a single physical TV.** During the live smoke, `GET /api/devices` returned two rows for the one UE40KU6000: `20.20.20.144:9197` (`edb506f0-…`) and `20.20.20.144:9119` (`bc9f866b-…`). A single Samsung TV publishes multiple UPnP services under distinct UDNs on distinct description ports; both pass the current post-fetch `isSamsungTv` filter, so the user's device list ends up showing "the same TV twice." The registry needs an IP-level dedup guard.

3. **Description-fetch queue burns CPU/network on obviously-non-Samsung devices.** Every SSDP hit from a Sonos speaker, a printer, a Chromecast, etc. currently rides all the way through `undici` fetch + XML parse before `isSamsungTv` rejects it. On a busy LAN this is 30+ wasted parses per discovery round. A cheap pre-fetch filter on the SSDP headers (`SERVER: … Samsung/…`, `USN: uuid:…::urn:samsung.com:…`) skips 90% of them before we ever touch the network.

All three are surfaced by the same live smoke run and share the same failure mode: "discovery works but the connect handshake fails, and the list is noisy." Bundling them keeps the transport pivot honest — the state machine, the domain-error mapping, and the HTTP/WS surface from C5 all stay; only what the session actor talks over the wire and how discovery pre-filters hits change.

## What Changes

- **Transport pivot (BREAKING for `tv-connection-lifecycle`).** Replace `back-end/src/tv/jsonrpc.ts`'s `undici.Pool` + JSON-RPC 2.0 request/response client with a WebSocket client on `ws://<ip>:8001/api/v2/channels/samsung.remote.control?name=<b64>` (and `&token=<token>` on subsequent connects). Retain the injectable `JsonRpcTransport`-shaped interface signature so `session.ts` doesn't have to know it's a WebSocket underneath — it still calls `transport.call(method, params)` and gets a decoded result or a mapped `TvError`. The undici + JSON-RPC-over-HTTP paths go away for TV communication.
- **Pairing pivot (BREAKING for `tv-connection-lifecycle`).** Drop the speculative `getAccessToken` JSON-RPC method. New pairing = open the WS URL without `token`, wait for the TV to fire `{"event":"ms.channel.connect","data":{"token":"..."}}` (user must accept the on-screen "Allow this device?" prompt on the physical remote), persist the returned token, and re-attach the WS with `&token=<token>` on every subsequent connect. `MYTV_TOKEN_<UDN>` env override still works.
- **Port assumption pivot.** Session manager no longer trusts `device.port` from the UPnP description (which is the description port, not the control port). It uses a hard-coded `SMART_VIEW_PORT = 8001` (with `MYTV_CONTROL_PORT_<UDN>` env override for edge cases). Documented as the correct port for Tizen consumer TVs from 2016 onwards; year/model derivation stays out of scope.
- **SSDP pre-fetch filter (ADD to `upnp-tv-discovery`).** In `back-end/src/discovery/index.ts` before enqueueing the description fetch, inspect the SSDP hit headers: if `USN` / `SERVER` / `ST` contains neither `samsung` (case-insensitive) nor a Samsung UUID prefix pattern, drop the hit at `debug` level. Post-fetch `isSamsungTv` stays as a defensive backstop.
- **IP-based dedup (ADD to `upnp-tv-discovery`).** In `back-end/src/discovery/registry.ts`, when a new Samsung UDN would be upserted at an IP that already holds an online Samsung device (different UDN), skip the second insert and log at `debug`. A single physical TV → a single registry row.
- **Docs sync.** `back-end/README.md` "TV connection lifecycle" section updated: HTTP surface unchanged, WS `session` event unchanged, but the transport section switches from "JSON-RPC 2.0 over HTTPS 1515/1516" to "Samsung Smart View WebSocket on 8001" with the message envelope and pairing flow spelled out. `docs/samsung-ip-control-protocol/` stays as-is (historical reference for hotel TVs); this repo simply doesn't target that protocol for MVP.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `tv-connection-lifecycle`: the "Per-TV IP Control session" requirement + all error/pairing scenarios are recast in terms of Samsung Smart View WebSocket transport on 8001 instead of JSON-RPC 2.0 over HTTPS 1515/1516. The state machine, `Reconnecting → Connecting` collapse, `AccessToken never leaves the back-end`, and domain error mapping (`TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`) are unchanged.
- `upnp-tv-discovery`: gains "SSDP pre-fetch Samsung filter" and "IP-based device dedup" requirements. The existing `Samsung TV filter`, `Registry keyed by UDN with no duplicates`, and `Devices marked offline` requirements stay — the new pre-fetch filter is an efficiency layer in front of them, and the IP dedup is an additional constraint layered on top of UDN keying.

## Impact

- **Requirements covered**: keeps `FR-CONNECTION-01…04`, `FR-ERROR-01` (foundation) satisfied; keeps `FR-DISCOVERY-05` (dedup) but tightens it to also cover multiple-UDNs-per-IP. Once this ships, `Connected` becomes reachable on a real Tizen TV, unblocking the C6/C7/C8 command capabilities on real hardware.
- **Depends on**: `tv-connection-lifecycle` (archived — this change modifies it), `upnp-tv-discovery` (archived — this change modifies it). Both prerequisites already satisfied.
- **Code**: replaces the body of `back-end/src/tv/jsonrpc.ts` (keeps the exported `JsonRpcTransport` type shape for `session.ts` continuity, or renames to `TvTransport` and updates the two call sites in `session.ts` / `manager.ts` / tests); updates `back-end/src/tv/session.ts` pairing path (drop `getAccessToken` call, replace with an "await WS connect ack" step); updates `back-end/src/tv/manager.ts` to override `device.port` with `SMART_VIEW_PORT`; adds a pre-fetch filter step in `back-end/src/discovery/index.ts`; adds an IP-dedup guard in `back-end/src/discovery/registry.ts`. Front-end unchanged (state machine + hook + RemoteScreen still consume the same client-visible states).
- **Dependencies added**: none new — `ws` is already a devDep from the `@fastify/websocket` broker path; this change promotes it to a runtime dep. `undici` stays as a runtime dep for `discovery/description.ts` (UPnP XML fetch) but is no longer used by `back-end/src/tv/`.
- **Non-goals**: WSS on port 8002 (self-signed cert handling — can add later once we know if any target TV forces TLS); TVs older than Tizen 2016 (Orsay, Legacy); art-mode / SmartThings / Wall Pro / Terrace extensions; a proper year-based control-port derivation heuristic (`SMART_VIEW_PORT = 8001` is the constant); an on-screen pairing UI in the SPA (still MVP: log + physical remote confirm).
