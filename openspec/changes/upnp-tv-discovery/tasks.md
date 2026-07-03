## 1. Back-end — SSDP transport

- [ ] 1.1 Add `node-ssdp`, `fast-xml-parser`, `p-queue`, `undici` to `back-end/package.json`.
- [ ] 1.2 Create `back-end/src/discovery/ssdp.ts` — thin wrapper around `node-ssdp` client: `search(st)` emits every response as an event `{ location, st, usn }`; keeps a NOTIFY listener open on 1900.
- [ ] 1.3 Create `back-end/src/discovery/description.ts` — `fetchDescription(location)` fetches with a 3 s timeout via `undici`, parses XML with `fast-xml-parser`, returns `{ udn, name, model, manufacturer } | null`.
- [ ] 1.4 Add the Samsung filter in `description.ts` — `manufacturer =~ /samsung/i` OR `modelName =~ /^(UN|QN|KS|The Frame|The Serif|The Terrace)/i`. Log rejects at `debug`.

## 2. Back-end — registry

- [ ] 2.1 Create `back-end/src/discovery/registry.ts` — in-memory `Map<UDN, Device>` with `upsert`, `snapshot`, `markOfflineOlderThan(ms)`. Emits typed events: `added | updated | removed | offline`.
- [ ] 2.2 Wire a p-queue with concurrency 5 in `back-end/src/discovery/index.ts`: on every SSDP hit, enqueue `fetchDescription(location)` → if Samsung, `registry.upsert({ udn, name, model, ip, port })`.
- [ ] 2.3 Add a 30 s timer that calls `registry.markOfflineOlderThan(60_000)`.
- [ ] 2.4 Add a 30 s timer that triggers a new M-SEARCH on the SSDP client.

## 3. Back-end — HTTP + WebSocket surface

- [ ] 3.1 Create `back-end/src/routes/devices.ts` — `GET /api/devices` returns `registry.snapshot()`.
- [ ] 3.2 Create `back-end/src/ws/broker.ts` — subscribes to registry events, fans them out to WebSocket clients as `{ topic: "devices", event, device? , devices? }`. On new connection, sends `{ topic: "devices", event: "snapshot", devices: registry.snapshot() }`.
- [ ] 3.3 In `back-end/src/app.ts`, start the discovery loop in an `onReady` hook after `platform-foundation`'s startup logic. Register the WebSocket broker.

## 4. Back-end — verification

- [ ] 4.1 Unit test: `description.ts` correctly filters a Samsung XML fixture in and a Sonos XML fixture out.
- [ ] 4.2 Unit test: registry `upsert` with the same UDN and a new IP overwrites the IP but keeps the UDN row (`FR-DISCOVERY-05`).
- [ ] 4.3 Unit test: `markOfflineOlderThan` flips `status` to `offline` and emits an `offline` event.
- [ ] 4.4 Integration test: boot the app with a stub SSDP client that emits two hits (one Samsung, one Sonos); `GET /api/devices` returns 1 entry.
- [ ] 4.5 Integration test: WebSocket client connects, receives the snapshot, then receives an `added` event when the stub emits a new UDN.
- [ ] 4.6 Assertion in the `/api/devices` test: response body contains no `AccessToken` (case-insensitive substring check).

## 5. Verification & handoff

- [ ] 5.1 `npm run back:build` passes.
- [ ] 5.2 On a LAN with a real Samsung TV, `npm run back:dev` then `curl http://localhost:3000/api/devices` returns at least the TV within 30 s of boot. If no Samsung TV is available, document the fixture-driven test as the manual repro.
- [ ] 5.3 Prepend a new dated entry to `docs/current-state.md`.
