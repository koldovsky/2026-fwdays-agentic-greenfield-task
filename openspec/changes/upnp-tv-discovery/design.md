## Context

Samsung's IP Control PDF (`docs/samsung-ip-control-protocol/HTV_IPControl_Protocol_20251120_v.2.8.pdf`) documents UPnP as the discovery mechanism; specifics of Samsung's UPnP profile (device type, service type) are covered in the `samsung-ip-control-protocol` skill — do not re-derive from the PDF each time. `AGENTS.md` mandates `UDN` as the stable identity, and the front-end must not talk to TVs directly — this change owns the whole discovery path server-side.

`platform-foundation` shipped an empty `/ws` mount and a Fastify app. This change defines the first WebSocket topic (`devices`) and the first data-carrying API route (`/api/devices`). The message shape decided here becomes the contract for the front-end device list.

## Goals / Non-Goals

**Goals:**
- Continuous, resilient discovery that survives TVs joining/leaving/rebooting.
- Stable UDN-keyed registry that never duplicates (`FR-DISCOVERY-05`).
- Push semantics so the UI updates without polling (`FR-UI-01` foundation).
- Samsung-only filter enforced server-side (`BC-02`).

**Non-Goals:**
- Pairing / AccessToken / any authenticated TV command — that is `tv-connection-lifecycle`.
- Persisting the registry to disk — MVP re-discovers on boot. Enough for a single-user LAN.
- Discovery of anything other than Samsung TVs.
- Manual add-by-IP — flagged as a requirements gap in `docs/capabilities.md`; comes in a follow-up change once the FR exists.

## Decisions

### D1 — SSDP: use `node-ssdp` (client + server)

`node-ssdp` handles the UDP 1900 multicast, timeouts, and NOTIFY listener out of the box. It is well-worn and small. Alternatives considered:

- Hand-rolled `dgram` client — extra ~100 lines to get right (multicast join, TTL, IPv4/IPv6 dance). Rejected for MVP.
- `@homebridge/ciao` — mDNS, not SSDP; wrong tool.

### D2 — Discovery cadence: 30 s periodic + async NOTIFY

- Periodic M-SEARCH every 30 s (`FR-DISCOVERY-03`) with `ST: urn:schemas-upnp-org:device:MediaRenderer:1` (Samsung TVs advertise as media renderers; skill has the exact ST).
- NOTIFY listener always on; a TV that joins between polls appears within its own SSDP advertise cycle (~2–5 s).
- On every M-SEARCH response or NOTIFY that matches the ST, we fetch the LOCATION XML — the LOCATION is not stable, but the UDN inside the XML is.

### D3 — Description parse: XML → typed record

Fetch LOCATION with a 3 s timeout via `undici`. Parse with `fast-xml-parser`. Extract:

```
UDN         → udn (strip "uuid:" prefix if present)
friendlyName → name
manufacturer → filter: must contain "Samsung" (case-insensitive)
modelName / modelNumber → model
```

IP + port come from the LOCATION URL itself, not from XML.

Any TV whose manufacturer does not match Samsung is discarded silently (log level `debug`, not warn — the LAN is full of non-Samsung UPnP devices).

### D4 — Registry keyed by UDN, offline via lastSeen

Data shape:

```
type Device = {
  udn: string;         // stable, comes from XML
  name: string;
  model: string | null;
  ip: string;
  port: number;
  status: "online" | "offline";
  lastSeen: number;    // epoch ms
};
```

On every SSDP hit whose XML matches, `upsert` by UDN and set `status: "online", lastSeen: now`. A background sweep every 30 s marks any device with `lastSeen < now - 60000` as `offline` (`FR-DISCOVERY-04`) and emits an update.

`ip`/`port` may change over time (DHCP renew, TV moves band). The UDN stays the same. This is why UDN is the key.

State diagram per device:

```
        first hit         miss > 60 s
  ─────▶ online  ───────────────────▶ offline
             ▲                              │
             └──────── new hit ─────────────┘
```

Removed status is not needed for MVP — offline devices linger in the registry until process restart, so a user power-cycling a TV still sees the row (greyed out).

### D5 — Registry pubsub → WebSocket topic `devices`

Registry emits typed events: `added | updated | removed | offline`. A tiny broker forwards them onto the `/ws` channel introduced by `platform-foundation` as messages of the shape:

```
{ topic: "devices", event: "added"|"updated"|"removed"|"offline", device: Device }
```

Also on connect: the broker sends a `{ topic: "devices", event: "snapshot", devices: Device[] }` so the UI has the initial state without a separate HTTP call. `GET /api/devices` remains as a REST fallback (useful for `curl`, tests, and clients that reconnect over HTTP).

### D6 — Concurrency: at most 5 concurrent description fetches

An overzealous M-SEARCH on a busy LAN can produce dozens of parallel LOCATION fetches. Use a `p-queue` (concurrency 5) so we never DoS the Pi or the LAN. Rejected: no queue, "small LANs so it doesn't matter" — a Samsung TV showroom demo could easily produce 30+ replies.

## Risks / Trade-offs

- [Some Samsung firmwares hide `manufacturer` or use non-Latin spelling] → Widen the filter to `manufacturer =~ /samsung/i || modelName =~ /^UN|^QN|^KS/i` (Samsung TV model prefixes). Document in the parser and cover with fixture tests.
- [LAN with hundreds of UPnP devices could bog down the fetch queue] → 5-concurrency cap plus a 3 s per-fetch timeout gives a hard ceiling on how long one M-SEARCH round can take (~ceil(N/5)×3 s in the worst case).
- [WebSocket clients that connect during the initial burst miss the snapshot] → The broker sends a fresh snapshot to every new connection, not just on registry change.
- [The 30 s cadence is guessy] → 30 s comes straight from `FR-DISCOVERY-03`. Changing it is a spec change, not a code change.

## Migration Plan

No migration — first discovery capability. Rollback: revert; the platform-foundation health endpoint still works.

## Open Questions

- Should we persist "last-seen offline" to disk so the list survives a Pi reboot? Deferred until the manual-add-by-IP change lands — those two features share the same persistence question.
- Should Samsung sub-brands (Frame, Serif, Terrace) need a separate ST or is the media-renderer ST universal? Skill claims universal; verify in the field during implementation.
