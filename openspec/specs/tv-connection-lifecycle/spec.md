## Purpose

Per-TV IP Control session state machine keyed by UDN. Owns the pairing / AccessToken lifecycle, the single keep-alive HTTPS agent per TV, the FIFO command queue that serializes state-changing calls, the reconnect budget, and the domain error union every downstream command capability maps into. Also owns the HTTP + WebSocket surface (`GET/POST /api/devices/:udn/session` and the `/ws` `devices/session` event) that the front-end consumes.

## Requirements

### Requirement: Per-TV IP Control session

The back-end SHALL establish an IP Control session per TV, keyed by UDN. Each session SHALL use exactly one keep-alive HTTPS agent to the TV. Covers `FR-CONNECTION-01`.

#### Scenario: Connect establishes a session

- **WHEN** a client calls `POST /api/devices/:udn/connect` for a TV that is currently `Disconnected`
- **THEN** the response state transitions to `Connecting`, then to `Connected` after the TV accepts, and the session's HTTPS pool holds an open keep-alive connection to `https://<ip>:<port>`

#### Scenario: Second connect on the same UDN is idempotent

- **WHEN** a session for the UDN is already `Connected` and a client calls `POST /api/devices/:udn/connect`
- **THEN** the response returns `state: "Connected"` and no new HTTPS pool is created

### Requirement: One active session per TV

There SHALL never be two simultaneous IP Control sessions for the same UDN. Covers `FR-CONNECTION-02`.

#### Scenario: Only one HTTPS pool per UDN

- **WHEN** two concurrent `POST /api/devices/:udn/connect` requests arrive
- **THEN** exactly one HTTPS pool is created and both requests observe the same `Connected` state

### Requirement: Automatic reconnect on unexpected disconnect

When a session transitions to `Reconnecting` due to an unexpected close, the back-end SHALL attempt to re-establish the session using an exponential-backoff schedule of at least 5 attempts. Covers `FR-CONNECTION-03`.

#### Scenario: Recovery after transient network drop

- **WHEN** the TV's TCP connection drops while the session is `Connected` and the TV becomes reachable again within 5 seconds
- **THEN** the session state passes through `Reconnecting` and ends at `Connected` without any client `connect` call

#### Scenario: Give up after cap

- **WHEN** all reconnect attempts fail
- **THEN** the session state transitions to `Disconnected` and no further reconnect attempts run until a client explicitly calls `POST /api/devices/:udn/connect`

### Requirement: Session state exposed to clients

The back-end SHALL expose the current session state through `GET /api/devices/:udn/session` and push transitions on the `/ws` `devices` topic. Client-visible states SHALL be exactly `Connecting | Connected | Disconnected | Offline`. Covers `FR-CONNECTION-04`.

#### Scenario: HTTP snapshot

- **WHEN** a client calls `GET /api/devices/:udn/session` for an unknown or never-connected UDN
- **THEN** the response is `200` with `{ state: "Disconnected" }`

#### Scenario: WebSocket delivers transitions

- **WHEN** any session transitions from `Connecting` to `Connected`
- **THEN** every WebSocket client receives `{ topic: "devices", event: "session", udn, state: "Connected" }` within 1 second

#### Scenario: Reconnecting is collapsed to Connecting for clients

- **WHEN** the internal state is `Reconnecting`
- **THEN** `/api/devices/:udn/session` and the WebSocket `session` event both report `state: "Connecting"` — never `Reconnecting`

### Requirement: AccessToken never leaves the back-end

The IP Control `AccessToken` SHALL be persisted only in a back-end-owned file with `0600` permissions and MUST NOT appear in any HTTP response body, WebSocket message, or log line.

#### Scenario: Token absent from session response

- **WHEN** a client calls `GET /api/devices/:udn/session`
- **THEN** the response body has no field named `accessToken` or `AccessToken` and no value equal to the persisted token

#### Scenario: Token absent from logs

- **WHEN** a JSON-RPC call is issued that includes an `AccessToken` in its params
- **THEN** the log line for that call does not contain the token's literal value at any nesting depth

#### Scenario: Token file has 0600 permissions

- **WHEN** the token store writes to `tokens.json`
- **THEN** the file mode is exactly `0600`

### Requirement: Serialized state-changing commands

Every state-changing JSON-RPC call issued through a session SHALL be enqueued on a per-session FIFO with concurrency 1. JSON-RPC calls MUST NOT be batched.

#### Scenario: Ordering preserved under load

- **WHEN** three state-changing commands are enqueued concurrently
- **THEN** they hit the wire in the order they were enqueued, and no HTTP request body is a JSON-RPC array (batch)

### Requirement: Domain error mapping

Every TV-side error SHALL be mapped into the domain error union `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown` before reaching the HTTP API. Raw `-32xxx` codes MUST NOT appear in HTTP response bodies. Covers `FR-ERROR-01` (foundation; UI surfacing is `error-surfacing`).

#### Scenario: Timeout maps to TvNotReachable

- **WHEN** the HTTPS pool cannot open a socket to the TV within the connect timeout
- **THEN** the resulting HTTP error envelope has `code: "TvNotReachable"`, status 502, and no raw `-32xxx` value in the body

#### Scenario: Unknown method maps to TvNotSupported

- **WHEN** the TV returns JSON-RPC error `-32601`
- **THEN** the resulting HTTP error envelope has `code: "TvNotSupported"`, status 501

#### Scenario: Log correlates raw and mapped codes

- **WHEN** any raw `-32xxx` code is received
- **THEN** it appears in a log line at level `warn` with the JSON-RPC `id` — but not in any HTTP response body

### Requirement: Session ties to discovery lifecycle

When `upnp-tv-discovery` marks a UDN offline, the back-end SHALL tear down that UDN's session and transition its state to `Offline`. When the same UDN comes back online, the session SHALL transition to `Disconnected` and stay there until the user calls `connect`.

#### Scenario: Discovery offline triggers Offline

- **WHEN** a UDN transitions to `status: "offline"` in the discovery registry while its session is `Connected`
- **THEN** the session pool is closed, session state becomes `Offline`, and clients receive a `session` WebSocket event with `state: "Offline"`

#### Scenario: Discovery back online returns to Disconnected

- **WHEN** a UDN in `Offline` state flips back to discovery `online`
- **THEN** the session state becomes `Disconnected` and no automatic reconnect fires — the user must call `connect`
