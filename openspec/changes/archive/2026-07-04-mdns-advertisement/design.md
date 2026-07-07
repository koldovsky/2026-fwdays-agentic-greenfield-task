## Context

Runs inside the same Fastify process introduced by `platform-foundation`. mDNS on Linux (the target OS on Orange Pi) commonly conflicts with a running Avahi daemon on port 5353 — worth calling out because it is the #1 reason a mDNS advertisement silently fails in production. `AGENTS.md` house rule: no cloud, no telemetry. `bonjour-service` is the pure-JS choice; `mdns` (native) would need a cross-compile toolchain for ARM which we do not want to build into the deploy story.

## Goals / Non-Goals

**Goals:**
- The service advertises as `mytv.local` on the active interface.
- Advertisement recovers automatically after network changes (interface flap, address change).
- The health endpoint reports mDNS state so we can debug from a browser tab.

**Non-Goals:**
- Browsing for other mDNS services (we only advertise; TV discovery uses UPnP, not mDNS).
- Custom TXT records beyond `path=/`, `version=<x>` — the DS/product does not need them in MVP.
- Coexistence with a running Avahi daemon on the same port; the deploy story documents "disable Avahi or run mytv with `AVAHI_COMPAT=1`" but this change does not attempt to make them share the socket.
- IPv6 advertisement — MVP is IPv4-only.

## Decisions

### D1 — Library: `bonjour-service`

Pure JS, no native build, actively maintained, TypeScript typings. Alternatives considered:

- `mdns` — native, needs libavahi headers or Bonjour SDK on macOS; a nightmare on ARM cross-builds. Rejected.
- `multicast-dns` — lower-level; we would have to hand-write service records. Rejected for MVP.

### D2 — Advertisement lifecycle tied to Fastify

```
Fastify ready → advertise mDNS
Fastify close → stop mDNS (with a small grace period so the goodbye packet leaves)
```

Wire via `app.addHook('onReady', …)` and `app.addHook('onClose', …)`. This keeps the advertisement window aligned with the HTTP listener — no window where `mytv.local` resolves but the port is not accepting.

### D3 — Recovery on interface change

Watch `os.networkInterfaces()` deltas. On a 5-second poll (cheap, and Node has no cross-platform event for this without a native dep), if the set of non-loopback IPv4 addresses changed, stop the current advertisement and restart. Log every restart with the old and new address list.

**Alternative considered:** `network` npm package or `dbus-native` on Linux. Rejected — the poll is 5 s of overhead every 5 s, well under any reasonable performance budget (NFR-07: <300 MB memory; NFR-08: <15 s start).

Simple lifecycle diagram:

```
      ┌──────────────┐
      │  Stopped     │
      └──────┬───────┘
             │ Fastify ready
             ▼
      ┌──────────────┐   iface change    ┌──────────────┐
      │ Advertising  │──────────────────▶│  Restarting  │
      └──────┬───────┘                   └──────┬───────┘
             │ Fastify close                    │ new iface
             ▼                                  │
      ┌──────────────┐                          │
      │  Stopped     │◀─────────────────────────┘
      └──────────────┘
```

### D4 — Health endpoint extension

`GET /api/health` (from `platform-foundation`) grows a `mdns` field: `{ state: 'advertising' | 'stopped' | 'error', hostname: 'mytv.local', address: '192.168.x.x', error?: 'reason' }`. Non-normative — it is a debug affordance, not a contract for the front-end.

## Risks / Trade-offs

- [Avahi already bound to 5353] → Startup fails with `EADDRINUSE`. Mitigation: catch the error, log a specific hint ("mDNS port 5353 is busy — is avahi-daemon running?"), set health to `state: error`, and keep the HTTP server running. The app is degraded (no `mytv.local`) but not down.
- [5-second interface poll misses rapid flaps] → Acceptable for MVP; a flap that recovers in <5 s does not require an mDNS restart anyway (the advertisement was still valid). Document and move on.
- [Multiple mytv instances on one LAN collide on `mytv.local`] → Out of MVP scope. `bonjour-service` handles the name conflict per RFC 6762 §9 (appends `-2`, etc.), which is ugly but correct. Users are expected to run one instance per LAN.
- [Some phones/tablets do not implement mDNS] → Cannot fix from the server side; documented behaviour of iOS and modern Android. User falls back to typing the IP.

## Migration Plan

No prior release to migrate from. Rollback: revert the change; `platform-foundation` remains reachable by IP.

## Open Questions

- Should the advertised service instance name be configurable (`INSTANCE_NAME=kitchen-mytv`) for users with multiple LAN segments? Deferred until someone actually asks.
