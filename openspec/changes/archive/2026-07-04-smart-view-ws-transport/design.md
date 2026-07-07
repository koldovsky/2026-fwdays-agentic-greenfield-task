## Context

The `tv-connection-lifecycle` (C5) capability shipped assuming Samsung's **hotel-TV IP Control** protocol — JSON-RPC 2.0 over HTTPS on ports 1515/1516 with an out-of-band-provisioned `AccessToken`, per `docs/samsung-ip-control-protocol/HTV_IPControl_Protocol_20251120_v.2.8.pdf` and the `samsung-ip-control-protocol` skill. Every downstream capability (`remote-control-keys`, `volume-control`, `input-management`) is written against that assumption.

The live-hardware smoke against a **consumer Samsung UE40KU6000 (Tizen, 2016)** on the implementer's LAN showed that this protocol is wrong for the target hardware. `POST /api/devices/<UDN>/connect` correctly walked `Disconnected → Connecting → tries pairing → transport times out → Disconnected` — the state machine, error mapping, and log-line correlation all fired, but the TV isn't listening on port 9197 or 1515/1516 with HTTPS + JSON-RPC.

What the TV DOES listen for: the **Samsung Smart View WebSocket API** on port 8001 (plain WS; port 8002 is the TLS variant with a self-signed cert, out of scope for MVP). Message shape is different, pairing is different, error signatures are different. But the *shape of the session actor* — state machine, keep-alive-per-TV, FIFO command queue, domain error union, HTTP + WS surface, front-end hook — is right; only the transport underneath and the pairing handshake need to change.

The other two live-smoke findings share the same rediscovery: (a) a single Tizen TV advertises multiple UPnP root devices under distinct UDNs on distinct description ports (we saw the UE40KU6000 registered twice, at `20.20.20.144:9197` and `20.20.20.144:9119`), and (b) the description-fetch queue burns work on every non-Samsung UPnP device on the LAN before rejecting it post-parse. Both are cheap SSDP-layer fixes that only make sense to ship alongside the transport pivot.

Prerequisites:
- `tv-connection-lifecycle` archived (this change modifies it).
- `upnp-tv-discovery` archived (this change modifies it).
- Node's `ws` package is already present in `back-end/node_modules/` — devDep for the `@fastify/websocket` broker path. This change promotes it to a runtime dep.

## Goals / Non-Goals

**Goals:**
- Real `Connected` state on a real Tizen consumer Samsung TV, end-to-end, without stubs.
- Preserve every C5 external contract that the front-end and downstream capabilities depend on: state machine, `Reconnecting → Connecting` client-collapse, `AccessToken` never on the wire, domain error union, HTTP routes, WS `session` event shape.
- Discovery shows exactly one row per physical TV.
- The description-fetch queue skips obviously-not-Samsung SSDP hits.

**Non-Goals:**
- WSS on port 8002 (TLS with self-signed cert — separate change once we find a TV that requires it).
- TVs older than Tizen 2016 (Orsay, Legacy) — different protocol family entirely.
- SmartThings, Art Mode channels, Wall Pro / Terrace / Frame extensions.
- Year- or model-based control-port derivation. Port is a compile-time constant (`SMART_VIEW_PORT = 8001`) with an env override per UDN.
- Front-end pairing UI. Still MVP: log line + user watches the TV screen + physical remote accept.
- Refactoring `jsonrpc.ts`'s exported type name away from `JsonRpcTransport`. It's the wrong name after this change (transport isn't JSON-RPC anymore), but renaming it churns `session.ts` + `manager.ts` + tests. Rename in a follow-up cleanup change if the misleading name bites.

## Decisions

### D1 — Transport: `ws` client, one WebSocket per session

`back-end/src/tv/jsonrpc.ts` (retained filename to keep the diff surface small; rename is a follow-up) exports a factory that returns a `TvTransport` (structurally identical to today's `JsonRpcTransport`). The concrete implementation opens a single `ws.WebSocket` to:

```
ws://<ip>:<SMART_VIEW_PORT>/api/v2/channels/samsung.remote.control?name=<b64>&token=<token>
```

Behavior:

- `call(method, params)` sends a text frame `JSON.stringify({ method, params: { ...params } })`. Samsung's Smart View is fire-and-forget for remote-control frames — no per-call response id. The Promise resolves as soon as the frame is sent; downstream code that wants ACK-semantics has to wait for a specific event on the socket.
- Alternatives considered:
  - **Per-call correlation via a synthetic id** (like JSON-RPC). Rejected — the wire protocol doesn't reserve an `id` field, so multiplexing would require reading un-related event streams and hoping. Better to make `call()` fire-and-forget and let higher-level code layer request-response on top when needed.
  - **Wrap `ws.send` in a Promise that resolves on the socket's `drain` event.** Kept as the resolve trigger — matches `ws`'s callback contract and gives back-pressure hooks for later.
- `close()` closes the socket with code 1000 (`normal closure`).
- The **connect handshake** is the only place we care about the WebSocket's own events: on `open`, the socket is "handshake-in-progress"; on receiving `{event: "ms.channel.connect", data: {clients, id, token?}}`, the session is Connected; on `{event: "ms.channel.unauthorized"}` or `{event: "ms.channel.timeOut"}` or socket `error`/`close` before ack, the connect fails.
- **Heartbeat** stays: instead of calling a `getSystemInfo` method (JSON-RPC vestige), the transport uses `ws.ping()` on a 15 s tick and treats a missing `pong` within 5 s as a dead session → triggers the Reconnecting transition.

### D2 — Pairing: name-based, on-screen accept

First connect for a UDN with no stored token:

1. Open the WS with only `name=<b64(mytv)>` in the query (no `token`).
2. Log at `info`: `"awaiting pairing confirmation on TV screen"`, including the UDN.
3. Wait for the first inbound event with a 30 s timeout:
   - `{event: "ms.channel.connect", data: {token: "<token>"}}` → persist the token via `token-store.saveToken(udn, token)`, transition to `Connected`.
   - `{event: "ms.channel.unauthorized"}` → user declined; transition to `Disconnected` with `TvNotSupported`.
   - `{event: "ms.channel.timeOut"}` or 30 s timeout → transition to `Disconnected` with `TvNotReachable`.

Subsequent connects with a stored token behave the same but with `&token=<token>` appended; the TV normally sends a `ms.channel.connect` ack **without** a `token` field (indicating "you're already trusted"). Both variants — with and without `token` in `data` — are treated as connect success.

`MYTV_TOKEN_<UDN>` env override still short-circuits the store lookup exactly as it does today.

Alternatives considered:
- **Full pairing UI in the SPA** (poll `GET /api/devices/:udn/session` for a `PairingRequired` state, show a modal): out of scope — MVP has no pairing UX outside of "look at the TV." Add later once `error-surfacing` (C9) exists.
- **Auto-retry after unauthorized**: rejected — the user actively declined; auto-retrying would be annoying and would leave the on-screen prompt stuck open.

### D3 — Port: constant, not derived

`SMART_VIEW_PORT = 8001` lives at the top of `back-end/src/tv/manager.ts`. `manager.ensure(udn)` reads it, plus `process.env[\`MYTV_CONTROL_PORT_${udn}\`]` as an optional per-UDN override, and passes THAT to `createSession(...)` — the manager never trusts `device.port` from the registry for the control connection.

Rationale: for Tizen 2016+ (the target hardware family), port 8001 is universal. Deriving it from year/model would require a lookup table we don't have, and the failure mode of guessing wrong (connect timeout) is exactly the failure mode the previous cycle just hit. A constant with an env escape hatch is both simpler and lets a power user work around any surprise.

`device.port` stays on the `Device` record for other consumers (e.g. future SmartThings integration might need it), but the session manager ignores it.

### D4 — SSDP pre-fetch filter

In `back-end/src/discovery/index.ts`, before enqueueing `fetchDescription(hit.location)` on the p-queue, check `hit.usn`, `hit.st`, and `hit.server` (add `server` to the `SsdpHit` type — `node-ssdp` provides it via response headers). If none contain `samsung` (case-insensitive), drop the hit with a `debug`-level log. The post-fetch `isSamsungTv(description)` filter stays as a defensive backstop.

The change to `SsdpHit`:

```ts
export interface SsdpHit {
  location: string;
  st: string;
  usn: string;
  server?: string; // added
  source: 'msearch' | 'notify';
}
```

`ssdp.ts` `handleHit` gains a `headers` argument threading; `parseNotify()` gets a matching return field.

Alternatives considered:
- **Fetch every hit regardless, filter only post-parse**: current behavior. Wasteful on a busy LAN — a Samsung showroom demo could produce 30+ non-Samsung parses per round.
- **Cache the LAN's known non-Samsung IPs and skip them on future rounds**: too clever; a printer that mid-way announces a firmware upgrade breaks the cache. The header check is cheap and stateless.

### D5 — IP-based dedup in the registry

`back-end/src/discovery/registry.ts` `upsert()` gains a check: if `input.udn` is not in the map AND another *online* entry already exists at `input.ip`, drop the insert and log at `debug`. If the incoming UDN is already in the map (just updating), no change — the existing UDN-keyed path applies.

Interaction with the offline sweep:
- `markOfflineOlderThan()` flips the winner UDN to `offline` when its `lastSeen` ages out.
- A subsequent hit at the same IP with a different UDN is now allowed (the winner is no longer `online`) — the previously-dropped UDN can take over.

Alternative considered:
- **Key the registry by IP instead of UDN**: violates the UDN-is-stable invariant that flows all the way through `tv-connection-lifecycle`. Rejected.
- **Return the winner UDN when the dropped one asks for a session**: pushes complexity into `manager.ts` and confuses the "one UDN one session" contract. Rejected.

### D6 — Error mapping

Extends `mapRpcErrorCode` — actually, `-32xxx` codes are gone with JSON-RPC. Replace with an `mapWsError` helper that switches on:

- `ws.close` with code `1000` → not an error (normal close).
- `ws.close` with code `1002` (protocol error) → `TvFailed`.
- `ws.close` with any other code, or `ws.error` before the connect ack → `TvNotReachable`.
- `{event: "ms.channel.unauthorized"}` → `TvNotSupported`.
- `{event: "ms.channel.timeOut"}` → `TvNotReachable`.
- `{event: "ms.error", data: {code: ...}}` → `TvFailed` (bucket-of-last-resort; the specific `code` values are inconsistent across firmware, log the raw payload at `warn`).
- Any unrecognized event → `TvUnknown`.

Domain code → HTTP status matrix from C5's `errors.ts` is unchanged (502 / 501 / 500 / 400 / 500 for `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`).

`errors.ts` keeps its existing exports; `mapRpcErrorCode` is retained for tests but marked `@deprecated` — deletion is a follow-up once the JSON-RPC unit tests are rewritten against `mapWsError`.

### D7 — Test strategy

- **`ws` transport unit tests**: use a real `ws.WebSocketServer` on `127.0.0.1:0` (kernel-picked port) and drive it from the test — `ws` is battle-tested; a stub `WebSocket` implementation would hide bugs in the handshake / event-listener wiring.
- **Session state-machine tests**: keep the existing stub-transport pattern from C5 (`session.test.ts`) — inject a `TvTransport` stub that surfaces the same `open` / `connect-ack` / `unauthorized` shapes. The state machine itself doesn't change.
- **Discovery pre-filter test**: unit-test the header predicate directly (`shouldFetch(hit)` returns `false` for Sonos-shaped headers, `true` for Samsung-shaped).
- **IP dedup test**: unit-test the registry — upsert UDN A at IP X, upsert UDN B at IP X → snapshot has only A. Then mark A offline via `markOfflineOlderThan`, upsert B again → snapshot has A (offline) and B (online).
- **Integration test**: extend `session-integration.test.ts` to use the real `ws` transport with a local `ws.WebSocketServer` stub that mimics the pairing handshake, so the "no AccessToken in HTTP body" assertion still covers the token literal end-to-end.

## Risks / Trade-offs

- **[Some Tizen firmwares only accept WSS on 8002]** → Not seen on the target UE40KU6000, but reported in the wild. Mitigation: `MYTV_CONTROL_PORT_<UDN>` env override lets a user switch to 8002 (needs a WSS-capable transport, tracked as a follow-up change).
- **[`ms.channel.connect` sometimes arrives with the SAME token that was passed in — the field is echoed, not re-issued]** → Persisting the returned token unconditionally is safe: same value overwrites the same file bytes. No bug, but worth noting so future maintainers don't think we're rotating tokens each connect.
- **[The Smart View WS surface is undocumented — behavior varies across firmware years]** → Every unexpected event shape falls through to `TvUnknown`. That's noisy but visible: a log line at `warn` with the raw payload gives the operator a hook, and the client-visible state stays `Disconnected` so nothing is silently lost.
- **[Renaming `JsonRpcTransport` to `TvTransport` now vs. later]** → Deferring the rename creates a two-cycle window where the type name mislabels the underlying protocol. Accepted — the churn (5+ files, all their tests) doesn't earn its keep this cycle.
- **[`ws` as a runtime dep]** → It's already in the transitive graph via `@fastify/websocket`. Promoting it to a direct dep is a one-line `package.json` change; no bundle-size or Orange Pi cross-arch concern (pure JS + prebuilt bufferutil / utf-8-validate optional native, both already resolved on the Pi from the mDNS install).
- **[The `heartbeat via ws.ping()` approach depends on the TV responding to pings]** → Samsung Tizen does respond to pings in every firmware we've seen. If a future TV drops that behavior, the heartbeat needs to swap to a lightweight `method` frame; the transport already has the primitives for either.
- **[IP dedup can strand a device if the winner UDN is discovered first but the WORK ing UPnP profile is on the loser UDN]** → We're picking arbitrary UDNs. Mitigation: the winner is whichever hit landed first, and if it turns out to be the wrong one the user can force a re-pick by unplugging the TV (offline sweep kicks in, next hit assigns). Documented; consciously accepted.

## Migration Plan

There's no backward compatibility to preserve — the previous transport didn't reach `Connected` on any real hardware, only on stubs. The migration is:

1. Land the code changes below in the tasks.md order.
2. Delete `back-end/dist/` and rerun `npm run back:build` — the shipped artifacts change layout under `back-end/src/tv/`.
3. Any token file at `~/.mytv/tokens.json` from the previous cycle is empty (no successful pairing ever ran); no data migration needed. Safe to leave the file in place.
4. `MYTV_TOKEN_<UDN>` env vars survive as-is — same shape, same store key.

Rollback: revert the change; `Connected` on real hardware breaks again, but the state machine + stub tests continue to pass. Nothing else regresses.

## Open Questions

- **Should we advertise `mytv` as a Smart View device on the LAN so multi-user access shows one shared "mytv" instead of one per install?** No, out of scope. `BC-04` says no multi-user for MVP; the WebSocket `name` param is per-install-effectively.
- **What happens if the TV is `Connected` and the user re-pairs from another device?** The Samsung stack invalidates the token; the next `call()` fails with a socket close. Our reconnect budget will burn 5 attempts, then transition to `Disconnected`. User re-triggers with `POST /connect`. Acceptable for MVP; a nicer UX belongs to `error-surfacing`.
- **Do we need to include the client's public IP in the WS `name` query for anything?** No — Samsung Smart View names are cosmetic, not security-relevant.
