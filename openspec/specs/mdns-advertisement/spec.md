## Purpose

Advertises the back-end HTTP service as `mytv.local` over mDNS so any peer on the LAN can reach the SPA at `http://mytv.local/` without knowing the host's IP. Keeps the advertisement healthy across network changes (interface flap, DHCP lease change, SSID switch) and exposes its state on `/api/health` for browser-tab diagnosis.

## Requirements

### Requirement: Service advertises itself over mDNS

The back-end SHALL advertise its HTTP service over mDNS on startup, once the HTTP listener is accepting connections. Covers `FR-MDNS-01`.

#### Scenario: Advertisement starts after HTTP ready

- **WHEN** the back-end process finishes `app.listen()`
- **THEN** an mDNS `_http._tcp` service record is broadcast on the LAN within 2 seconds

#### Scenario: Advertisement withdraws on shutdown

- **WHEN** the back-end process receives SIGINT or SIGTERM and begins shutdown
- **THEN** the mDNS responder broadcasts a goodbye packet for the service record before the process exits

### Requirement: Advertised hostname is mytv.local

The advertised hostname SHALL be `mytv.local`. Covers `FR-MDNS-02`. Completes the mDNS half of `FR-HOSTING-02`.

#### Scenario: Peer resolves mytv.local

- **WHEN** any peer on the same LAN queries mDNS for `mytv.local`
- **THEN** the back-end responds with the current active IPv4 address of the host

#### Scenario: Browser reaches the SPA via mytv.local

- **WHEN** a user opens `http://mytv.local/` in a modern browser on the same LAN
- **THEN** the SPA served by `platform-foundation` loads

### Requirement: mDNS recovers after network changes

The mDNS advertisement SHALL be re-issued automatically after any change in the host's non-loopback IPv4 interface set (interface flap, new address assignment, SSID change). Covers `FR-MDNS-03`.

#### Scenario: Interface flap re-announces

- **WHEN** a network interface goes down and comes back up while the back-end is running
- **THEN** the responder detects the address-set change within 10 seconds and issues a fresh mDNS announcement for `mytv.local`

#### Scenario: IP lease change re-announces

- **WHEN** the host's active IPv4 address changes (DHCP renewal with a different lease)
- **THEN** the responder announces `mytv.local` mapped to the new address and any peer's next resolve returns the new address

### Requirement: mDNS state exposed on health endpoint

The `/api/health` endpoint added by `platform-foundation` SHALL surface the current mDNS state so operators can diagnose "site is unreachable at mytv.local" from a browser tab.

#### Scenario: Health reports advertising state

- **WHEN** mDNS is currently advertising
- **THEN** `GET /api/health` returns a JSON body containing `mdns: { state: "advertising", hostname: "mytv.local", address: <ipv4> }`

#### Scenario: Health reports error when mDNS port is busy

- **WHEN** the mDNS responder cannot bind port 5353 (e.g. Avahi already running)
- **THEN** `GET /api/health` returns `mdns: { state: "error", error: <human-readable reason> }` and the HTTP server continues serving other requests normally
