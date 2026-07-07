## 1. Back-end — SSDP transport

- [x] 1.1 Add `node-ssdp`, `fast-xml-parser`, `p-queue`, `undici` to `back-end/package.json`. (`@types/node-ssdp` added as a devDep — node-ssdp ships no built-in types.)
- [x] 1.2 Create `back-end/src/discovery/ssdp.ts` — thin wrapper around `node-ssdp` client: `search(st)` emits every response as an event `{ location, st, usn }`; keeps a NOTIFY listener open on 1900. **Design correction noted in code:** `node-ssdp`'s Client binds an ephemeral port, so it only receives unicast M-SEARCH responses, not multicast NOTIFYs targeted at `239.255.255.250:1900`. `ssdp.ts` therefore combines `node-ssdp` Client (M-SEARCH) with a raw `dgram` socket bound to 1900 that joins the SSDP multicast group and parses NOTIFY frames itself. Both paths emit the same `hit` event with `source: 'msearch' | 'notify'`.
- [x] 1.3 Create `back-end/src/discovery/description.ts` — `fetchDescription(location)` fetches with a 3 s timeout via `undici`, parses XML with `fast-xml-parser`, returns `{ udn, name, model, manufacturer } | null`.
- [x] 1.4 Add the Samsung filter in `description.ts` — `manufacturer =~ /samsung/i` OR `modelName =~ /^(UN|QN|KS|The Frame|The Serif|The Terrace)/i`. Rejects logged at `debug` at the discovery-orchestrator layer (registry.ts / discovery/index.ts) where the transport context is available; `isSamsungTv()` itself stays a pure predicate so unit tests aren't logger-coupled.

## 2. Back-end — registry

- [x] 2.1 Create `back-end/src/discovery/registry.ts` — in-memory `Map<UDN, Device>` with `upsert`, `snapshot`, `markOfflineOlderThan(ms)`. Emits typed events: `added | updated | removed | offline`. (`removed` stays on the event union for schema completeness; MVP keeps offline devices in the registry per the spec, so the built-in sweep does not emit `removed`.)
- [x] 2.2 Wire a p-queue with concurrency 5 in `back-end/src/discovery/index.ts`: on every SSDP hit, enqueue `fetchDescription(location)` → if Samsung, `registry.upsert({ udn, name, model, ip, port })`. IP/port come from parsing the LOCATION URL, not from the XML.
- [x] 2.3 Add a 30 s timer that calls `registry.markOfflineOlderThan(60_000)`.
- [x] 2.4 Add a 30 s timer that triggers a new M-SEARCH on the SSDP client. Initial M-SEARCH is also fired immediately at start-up so the spec's "M-SEARCH within 2 s of `app.listen()`" scenario holds without waiting for the first timer tick.

## 3. Back-end — HTTP + WebSocket surface

- [x] 3.1 Create `back-end/src/routes/devices.ts` — `GET /api/devices` returns `registry.snapshot()`.
- [x] 3.2 Create `back-end/src/ws/broker.ts` — subscribes to registry events, fans them out to WebSocket clients as `{ topic: "devices", event, device? , devices? }`. On new connection, sends `{ topic: "devices", event: "snapshot", devices: registry.snapshot() }`.
- [x] 3.3 In `back-end/src/app.ts`, start the discovery loop in an `onReady` hook after `platform-foundation`'s startup logic. Register the WebSocket broker. Also decorates the Fastify scope with `app.discovery = { registry, broker, handle }` (mirrors the existing `app.mdns` pattern) so routes and tests can reach the registry without a module singleton. Added `DISCOVERY_ENABLED=0` opt-out so tests that don't stub the transport can boot the app without touching a real socket.

## 4. Back-end — verification

- [x] 4.1 Unit test: `description.ts` correctly filters a Samsung XML fixture in and a Sonos XML fixture out. (`src/discovery/description.test.ts` — 4 tests.)
- [x] 4.2 Unit test: registry `upsert` with the same UDN and a new IP overwrites the IP but keeps the UDN row (`FR-DISCOVERY-05`). (`src/discovery/registry.test.ts`.)
- [x] 4.3 Unit test: `markOfflineOlderThan` flips `status` to `offline` and emits an `offline` event. Also covered: repeat sweeps don't re-emit `offline`. (`src/discovery/registry.test.ts` — 4 tests.)
- [x] 4.4 Integration test: boot the app with a stub SSDP client that emits two hits (one Samsung, one Sonos); `GET /api/devices` returns 1 entry. (`src/discovery/discovery.test.ts`.)
- [x] 4.5 Integration test: WebSocket client connects, receives the snapshot, then receives an `added` event when the stub emits a new UDN. (`src/discovery/discovery.test.ts`.)
- [x] 4.6 Assertion in the `/api/devices` test: response body contains no `AccessToken` (case-insensitive substring check). (`src/discovery/discovery.test.ts`.)

## 5. Verification & handoff

- [x] 5.1 `npm run back:build` passes.
- [x] 5.2 On a LAN with a real Samsung TV, `npm run back:dev` then `curl http://localhost:3000/api/devices` returns at least the TV within 30 s of boot. If no Samsung TV is available, document the fixture-driven test as the manual repro. **No Samsung TV available in the implementer's environment** — `src/discovery/discovery.test.ts` is the documented fixture-driven manual gate; it exercises the SSDP-hit → description-fetch → Samsung-filter → registry-upsert → HTTP/WS-fanout path end-to-end via a `StubSsdpTransport` + fixture descriptions, and its four assertions cover both `GET /api/devices` and the WebSocket snapshot/added contract. Task 5.2's wording pre-dates the port-80 flip; the correct dev-time URL is `PORT=3000 npm run back:dev` + `curl http://localhost:3000/api/devices` (or bind `:80` if the Node binary has `cap_net_bind_service`).
- [x] 5.3 Prepend a new dated entry to `docs/current-state.md`. Also fixed a pre-existing `npm run back:test` script bug so `npm run back:test` now runs the full 23-test suite instead of silently skipping the 4 new discovery test files (unquoted `**` glob → quoted).
