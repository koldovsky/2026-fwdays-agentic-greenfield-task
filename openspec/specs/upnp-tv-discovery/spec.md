## Purpose

Continuously discover Samsung televisions on the local network via UPnP/SSDP, keep a stable UDN-keyed registry that survives IP-lease churn, and surface the current registry over both a REST snapshot endpoint (`GET /api/devices`) and a WebSocket topic (`devices`) so the SPA's device-list screen updates without polling. Samsung-only filter is enforced server-side.

## Requirements

### Requirement: Discovery starts with the process

Discovery SHALL start automatically as part of application startup, without user action. Covers `FR-DISCOVERY-02`.

#### Scenario: Discovery begins on boot

- **WHEN** the back-end finishes `app.listen()`
- **THEN** an initial SSDP M-SEARCH is broadcast within 2 seconds and the periodic discovery loop is running

### Requirement: Continuous UPnP discovery on 30 s cadence

The back-end SHALL perform an SSDP M-SEARCH broadcast every 30 seconds and SHALL listen for asynchronous SSDP NOTIFY messages between polls. Covers `FR-DISCOVERY-01`, `FR-DISCOVERY-03`.

#### Scenario: Periodic M-SEARCH

- **WHEN** the discovery loop has been running for 90 seconds
- **THEN** at least three M-SEARCH broadcasts have been sent

#### Scenario: NOTIFY registers immediately

- **WHEN** a TV multicasts an SSDP `ssdp:alive` NOTIFY message
- **THEN** the back-end fetches the LOCATION, validates it is a Samsung TV, and adds/updates the registry within 5 seconds — without waiting for the next scheduled M-SEARCH

### Requirement: Samsung TV filter

The registry SHALL only contain devices whose UPnP device description identifies them as Samsung televisions. Non-Samsung devices SHALL be discarded silently. Covers `BC-02`.

#### Scenario: Non-Samsung UPnP device is ignored

- **WHEN** a Sonos speaker or a printer responds to M-SEARCH
- **THEN** the device does not appear in `GET /api/devices` and no `devices/added` message is pushed on the WebSocket

### Requirement: Registry keyed by UDN with no duplicates

The registry SHALL use the UPnP `UDN` as the stable identity for each TV. A TV whose IP address changes SHALL remain a single entry keyed by the same UDN. Covers `FR-DISCOVERY-05`.

#### Scenario: Same UDN, different IPs, single entry

- **WHEN** a TV is discovered at `192.168.1.42` and later re-discovered with the same UDN at `192.168.1.99`
- **THEN** `GET /api/devices` contains exactly one entry for that UDN, and its `ip` field equals `192.168.1.99`

### Requirement: Devices marked offline after 60 s without a sighting

A TV SHALL be marked `status: "offline"` when no SSDP hit for it has been observed for at least 60 seconds. Offline devices SHALL remain in the registry so users can see previously-known TVs. Covers `FR-DISCOVERY-04`.

#### Scenario: Silent TV goes offline

- **WHEN** a TV is present, then stops responding to SSDP for 65 seconds
- **THEN** its registry entry has `status: "offline"` and a `devices/offline` message was pushed on the WebSocket

#### Scenario: Offline TV comes back online

- **WHEN** a TV that is currently `offline` in the registry responds to SSDP again
- **THEN** its `status` flips to `"online"` and a `devices/updated` message is pushed on the WebSocket

### Requirement: HTTP snapshot endpoint

The back-end SHALL expose `GET /api/devices` returning a JSON array of registry entries. Each entry SHALL include `udn`, `name`, `model`, `ip`, `port`, `status`, and `lastSeen` (epoch ms).

#### Scenario: Snapshot lists discovered TVs

- **WHEN** the registry contains one online TV
- **THEN** `GET /api/devices` returns `200` with `[{ udn, name, model, ip, port, status: "online", lastSeen: <number> }]`

#### Scenario: AccessToken never appears in snapshot

- **WHEN** any client fetches `GET /api/devices`
- **THEN** the response body contains no field named `accessToken` or `AccessToken` and no value that matches a token pattern

### Requirement: WebSocket topic `devices` pushes deltas

The `/ws` channel SHALL push `devices` messages to every connected client covering the events `snapshot`, `added`, `updated`, `removed`, `offline`.

#### Scenario: Snapshot on connect

- **WHEN** a client opens a WebSocket to `/ws`
- **THEN** within 1 second the client receives a message with shape `{ topic: "devices", event: "snapshot", devices: Device[] }`

#### Scenario: Add pushed as delta

- **WHEN** a previously unseen Samsung TV is discovered
- **THEN** every connected WebSocket client receives `{ topic: "devices", event: "added", device: Device }`

### Requirement: Pre-fetch Samsung SSDP filter

Before enqueueing an SSDP hit for a description-XML fetch, the discovery orchestrator SHALL inspect the SSDP headers (`USN`, `SERVER`, `ST`) and drop the hit at level `debug` if none of them contain a Samsung signature — either the case-insensitive substring `samsung` or a Samsung UUID prefix pattern (`uuid:` prefix used by Samsung Tizen TVs). Post-fetch `isSamsungTv` remains as a defensive backstop for edge-case firmware that hides the vendor in headers but exposes it in the description XML.

The intent is efficiency, not correctness: on a busy LAN with dozens of non-Samsung UPnP devices (Sonos speakers, printers, Chromecasts) each SSDP hit currently rides through an `undici` fetch + XML parse before being rejected. The pre-filter drops these before we ever touch the network.

#### Scenario: Non-Samsung SSDP hit is dropped before description fetch

- **WHEN** an SSDP `M-SEARCH` response or `NOTIFY` arrives with headers containing no Samsung signature (e.g. `USN: uuid:5f9e…::urn:schemas-upnp-org:device:MediaRenderer:1`, `SERVER: Linux/… IpBridge/1.…`)
- **THEN** the discovery orchestrator does NOT enqueue a description fetch for that hit, no `undici.request` runs for its `LOCATION`, and a `debug`-level log line records the drop reason

#### Scenario: Samsung SSDP hit still fetches the description

- **WHEN** an SSDP hit arrives with headers containing a Samsung signature (`SERVER: … SmartTV/…` or `USN` containing `samsung`)
- **THEN** the description fetch is enqueued as before and the post-fetch `isSamsungTv` filter runs as the backstop

### Requirement: IP-based device dedup

The registry SHALL treat a single LAN IP as belonging to at most one Samsung TV. When a new UDN would be upserted at an IP that already holds an `online` Samsung device with a different UDN, the new insert SHALL be dropped at level `debug` — the first Samsung UDN wins per IP.

The existing `Registry keyed by UDN with no duplicates` requirement is unchanged: the same UDN at a new IP still overwrites the IP field on the existing row. This new requirement layers on top for the specific case where a physical TV advertises multiple UPnP root devices under distinct UDNs (as happens on Samsung Tizen — one for the media renderer, one for the display, etc., each on its own description port).

The intent is that the SPA's device list shows exactly one row per physical TV, not one row per advertised UPnP service.

#### Scenario: Second UDN at the same IP is dropped

- **WHEN** the registry already contains an online Samsung device at `192.168.1.42` with UDN `edb506f0-…` and a new hit arrives with UDN `bc9f866b-…` also at `192.168.1.42`
- **THEN** the second insert is dropped, `GET /api/devices` still returns exactly one entry for `192.168.1.42`, and the `edb506f0-…` row is preserved with its original UDN

#### Scenario: Same UDN at a new IP still updates the IP

- **WHEN** the registry contains a device at `192.168.1.42` with UDN `edb506f0-…` and the same UDN reappears at `192.168.1.99`
- **THEN** the existing entry's IP field updates to `192.168.1.99` (per the existing UDN-keyed dedup) — the IP dedup does NOT block this because the UDN matches

#### Scenario: A dropped UDN can take over when the winner goes offline

- **WHEN** the winner UDN at an IP flips to `offline` (via the existing offline sweep) and a subsequent SSDP hit at the same IP carries a different UDN
- **THEN** the new UDN is accepted (IP dedup only blocks concurrent online entries) — this avoids stranding an IP if the first-seen UPnP service dies
