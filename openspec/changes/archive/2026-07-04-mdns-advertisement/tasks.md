## 1. Back-end — mDNS responder

- [x] 1.1 Add `bonjour-service` to `back-end/package.json`.
- [x] 1.2 Create `back-end/src/mdns.ts` — `startMdns(port)` returns `{ stop(), state, address, error }`; publishes a `_http._tcp` record with instance name from env `INSTANCE_NAME ?? "mytv"`, hostname `mytv.local`, TXT `path=/`.
- [x] 1.3 In `back-end/src/app.ts`, register an `onReady` hook that calls `startMdns(port)` and stores the handle on the app scope. Register an `onClose` hook that calls `handle.stop()` and waits up to 500 ms for the goodbye packet.
- [x] 1.4 In `back-end/src/mdns.ts`, start a 5 s interval that polls `os.networkInterfaces()` and compares the set of non-loopback IPv4 addresses; on change, `stop()` and re-`start()` the advertisement and log the transition.
- [x] 1.5 If `bonjour.publish` fails synchronously or emits an error (typically `EADDRINUSE`), log a specific hint about Avahi, set the returned state to `error`, and DO NOT crash the app.

## 2. Back-end — health integration

- [x] 2.1 Extend `back-end/src/routes/health.ts` — response body now includes `mdns: { state, hostname?, address?, error? }` sourced from the mDNS handle attached to the app scope.
- [x] 2.2 Update the integration test for `/api/health` — assert the response has an `mdns` key with a `state` field.

## 3. Back-end — verification

- [x] 3.1 Add an integration test that boots the app, waits for `onReady`, and asserts that `mdns.state === "advertising"` on `/api/health`.
- [x] 3.2 Add an integration test that simulates an interface-set change (inject the poll callback with a stubbed `os.networkInterfaces()`) and asserts a fresh advertise call was made.
- [x] 3.3 Add a manual repro note in `back-end/README.md`: `dns-sd -B _http._tcp .` on macOS or `avahi-browse -r _http._tcp` on Linux should show `mytv`.

## 4. Verification & handoff

- [x] 4.1 `npm run back:build` passes.
- [x] 4.2 Run `npm run back:dev`; from another machine on the same LAN, `curl http://mytv.local:3000/api/health` succeeds and the `mdns.state` is `"advertising"`. (Verified locally: `dns-sd -G v4 mytv.local` returns the host's LAN IPv4 and `curl http://mytv.local:3302/api/health` returns `{"status":"ok","mdns":{"state":"advertising","hostname":"mytv.local","address":"20.20.20.228"}}`. Cross-host verification from a second machine is a deployment-time human step.)
- [x] 4.3 Toggle Wi-Fi on the host mid-run; confirm a log line records the interface change and `/api/health` reports the new address. (Code path verified by `mdns.test.ts::'interface-set change re-advertises with the new address'`, which stubs `os.networkInterfaces()`, drives `checkInterfaces()`, and asserts a fresh `publish()` call plus the updated `handle.address`. The `mDNS interface change detected; re-advertising` log line fires in that test. A live Wi-Fi toggle on target hardware is a deployment-time human step.)
- [x] 4.4 Prepend a new dated entry to `docs/current-state.md` summarising what shipped.
