## Why

Capability **C2** (`docs/capabilities.md`) — without mDNS the user cannot reach the app at `http://mytv.local/` and must instead find the Orange Pi's IP address by hand. That breaks the entire "open one URL, done" UX promised by the product brief. mDNS is small, self-contained, and can ship in parallel with `platform-foundation` (C1) — nothing else depends on it, but the device-list UX collapses without it.

The advertisement must also survive network changes (the Pi joins a new SSID, the interface flaps, the router hands out a new lease) — otherwise the service silently disappears from the browser's cache of resolvable names.

## What Changes

- Introduce an mDNS responder inside the back-end process that advertises the service as `mytv.local` and a `_http._tcp` service record on the configured port (default 80 in prod, 3000 in dev).
- Bind the responder to network-interface change events so the advertisement is torn down and re-announced when the active interface changes or a new address is assigned (`FR-MDNS-03`).
- Publish a small structured log line on every advertise / withdraw / re-advertise event so a network-flakiness bug can be diagnosed from logs alone.
- Add a health-endpoint field indicating that mDNS is currently advertising (or an error reason), so `platform-foundation`'s health check can surface it.
- No front-end change — the user's browser resolves `mytv.local` via the OS mDNS resolver; nothing to do in the SPA.

## Capabilities

### New Capabilities

- `mdns-advertisement`: advertises the back-end as `mytv.local` over mDNS and keeps that advertisement healthy across network changes.

### Modified Capabilities

<!-- None yet: platform-foundation.spec.md will be extended in later changes, but this change only ADDS. -->

## Impact

- **Requirements covered**: `FR-MDNS-01`, `FR-MDNS-02`, `FR-MDNS-03`. Completes the mDNS half of `FR-HOSTING-02` (`platform-foundation` covers the HTTP half).
- **Depends on**: `platform-foundation` (needs the Fastify boot to advertise a real service; needs the logger for observability). The change refuses to start until `platform-foundation` is archived.
- **Code**: adds `back-end/src/mdns.ts`, wires start/stop into `back-end/src/app.ts`; extends `back-end/src/routes/health.ts` to report mDNS state.
- **Dependencies added**: `bonjour-service` (pure-JS mDNS, no native compilation — friendlier to the Orange Pi cross-arch build).
- **Non-goals**: multi-instance discovery (there is exactly one mytv per LAN in MVP); DNS-SD service browsing (we advertise, we do not browse for peers); TLS or `https://mytv.local/` — local traffic only per `BC-01/BC-03/BC-05`.
