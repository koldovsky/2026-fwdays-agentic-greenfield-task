## ADDED Requirements

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
