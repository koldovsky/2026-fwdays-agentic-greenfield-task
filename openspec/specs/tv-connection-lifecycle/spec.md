## Purpose

Per-TV Samsung Smart View WebSocket session state machine keyed by UDN. Owns the pairing / token lifecycle, one WebSocket connection per TV, the FIFO command queue that serializes state-changing calls, the reconnect budget, and the domain error union every downstream command capability maps into. Also owns the HTTP + WebSocket surface (`GET/POST /api/devices/:udn/session` and the `/ws` `devices/session` event) that the front-end consumes.

## Requirements

### Requirement: Per-TV IP Control session

The back-end SHALL establish a Samsung Smart View WebSocket session per TV, keyed by UDN. The transport SHALL be a plain WebSocket on port `8001` (fixed constant `SMART_VIEW_PORT = 8001`, overridable per-UDN via env `MYTV_CONTROL_PORT_<UDN>` for edge cases). Each session SHALL hold exactly one active WebSocket to the TV. Covers `FR-CONNECTION-01`.

The URL SHALL be `ws://<ip>:8001/api/v2/channels/samsung.remote.control?name=<b64-app-name>` on first connect and `ws://<ip>:8001/api/v2/channels/samsung.remote.control?name=<b64-app-name>&token=<token>` on subsequent connects, where `<b64-app-name>` is the URL-safe Base64 encoding of a stable app name (default `mytv`).

The port from the UPnP description (`Device.port`) SHALL NOT be used for the control connection — it is the description port, not the control port. It is retained on `Device` for other consumers but ignored by the session manager.

#### Scenario: Connect establishes a WebSocket session

- **WHEN** a client calls `POST /api/devices/:udn/connect` for a TV that is currently `Disconnected`
- **THEN** the session opens a plain WebSocket to `ws://<ip>:8001/api/v2/channels/samsung.remote.control?name=<b64>&token=<token>`, the response state transitions to `Connecting`, then to `Connected` after the TV's connect ack arrives

#### Scenario: Second connect on the same UDN is idempotent

- **WHEN** a session for the UDN is already `Connected` and a client calls `POST /api/devices/:udn/connect`
- **THEN** the response returns `state: "Connected"` and no new WebSocket is opened

### Requirement: Smart View pairing on first connect

The back-end SHALL perform the Samsung Smart View pairing handshake on the first `connect` for a UDN with no stored token. Pairing is name-based: the WebSocket URL includes only `name=<b64>` (no `token`), the TV displays an on-screen "Allow this device?" prompt, and on user accept the TV replies with `{"event":"ms.channel.connect","data":{"token":"<token>"}}`. The back-end SHALL persist that token via the existing token store and re-attach subsequent connections with `&token=<token>`.

If the pairing handshake is refused (user declines / TV emits `ms.channel.unauthorized`), the session SHALL transition to `Disconnected` and a log line SHALL guide the operator: either retry `POST /connect` and accept on the TV, or preload a known token via `MYTV_TOKEN_<UDN>` env.

#### Scenario: Fresh UDN triggers on-screen pairing prompt

- **WHEN** `POST /api/devices/:udn/connect` is called for a UDN with no token in the token store and no `MYTV_TOKEN_<UDN>` env var set
- **THEN** the back-end opens a WebSocket without a `token` query parameter, logs "awaiting pairing confirmation on TV screen" at level `info`, and holds the session at `Connecting` until the TV emits either `ms.channel.connect` (with a `token`) or `ms.channel.unauthorized`

#### Scenario: Pairing token is persisted and reused

- **WHEN** the TV emits `{"event":"ms.channel.connect","data":{"token":"AA…"}}` during a fresh-UDN handshake
- **THEN** the token is written to the token store (`0600` permissions), the session transitions to `Connected`, and the next `POST /api/devices/:udn/connect` opens the WebSocket URL with `&token=AA…` appended, without another on-screen prompt

### Requirement: One active session per TV

There SHALL never be two simultaneous Smart View WebSocket sessions for the same UDN. Covers `FR-CONNECTION-02`.

#### Scenario: Only one WebSocket per UDN

- **WHEN** two concurrent `POST /api/devices/:udn/connect` requests arrive
- **THEN** exactly one WebSocket connection is created and both requests observe the same `Connected` state

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

The Samsung Smart View `token` returned in the `{event: "ms.channel.connect"}` payload SHALL be persisted only in a back-end-owned file with `0600` permissions and MUST NOT appear in any HTTP response body, WebSocket message sent to SPA clients, or log line. The `AccessToken` key stays on the redactor's SENSITIVE_KEYS list along with `token` and `authorization`.

#### Scenario: Token absent from session response

- **WHEN** a client calls `GET /api/devices/:udn/session`
- **THEN** the response body has no field named `accessToken` / `AccessToken` / `token` and no value equal to the persisted token

#### Scenario: Token absent from logs

- **WHEN** a Smart View WebSocket URL is opened that includes `&token=<value>` in its query string, or an incoming `ms.channel.connect` event carries `data.token`
- **THEN** neither the persisted token literal nor the URL's `token=...` fragment appears in any log line at any nesting depth

#### Scenario: Token file has 0600 permissions

- **WHEN** the token store writes to `tokens.json`
- **THEN** the file mode is exactly `0600`

### Requirement: Serialized state-changing commands over Smart View WebSocket

Every state-changing message issued through the Smart View WebSocket SHALL go through a per-session FIFO queue with concurrency 1. Multiple in-flight WebSocket sends MUST NOT be batched into a single frame. The queue holds even during `Reconnecting` — commands enqueued while the socket is down wait for a reconnect (bounded by the reconnect cap) rather than failing immediately.

#### Scenario: Ordering preserved under load

- **WHEN** three state-changing commands (`{method:"ms.remote.control", …}` for `KEY_UP`, `KEY_DOWN`, `KEY_ENTER`) are enqueued concurrently against a Connected session
- **THEN** they are sent as three separate WebSocket text frames in the order they were enqueued, and no frame combines multiple `method` payloads

### Requirement: Domain error mapping

Every TV-side error SHALL be mapped into the domain error union `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown` before reaching the HTTP API. The Smart View WebSocket surface has its own error signatures — the transport SHALL translate them, not surface them raw. Covers `FR-ERROR-01`.

Mapping table:

| Wire signal                                     | Domain code       | HTTP status |
| ----------------------------------------------- | ----------------- | ----------- |
| WS handshake refused / socket error / timeout   | `TvNotReachable`  | 502         |
| WS closes with code `1002` (protocol error)     | `TvFailed`        | 500         |
| TV emits `{event:"ms.channel.unauthorized"}`    | `TvNotSupported`  | 501         |
| TV emits `{event:"ms.channel.timeOut"}`         | `TvNotReachable`  | 502         |
| TV emits `{event:"ms.error"}` with data         | `TvFailed`        | 500         |
| Any unknown `ms.error` variant                  | `TvUnknown`       | 500         |

Raw WebSocket close codes, `ms.error` payloads, and unauthorized events MUST NOT appear in HTTP response bodies. They MAY appear at `warn` level in the log, correlated by the session's WebSocket connect id.

#### Scenario: Handshake timeout maps to TvNotReachable

- **WHEN** the WebSocket handshake to `ws://<ip>:8001/...` cannot complete within the connect timeout
- **THEN** the resulting HTTP error envelope has `code: "TvNotReachable"`, status 502, and no raw close code or error payload in the body

#### Scenario: Unauthorized event maps to TvNotSupported

- **WHEN** the TV emits `{"event":"ms.channel.unauthorized"}` during the connect handshake (user rejected the on-screen prompt, or the token is invalid)
- **THEN** the resulting HTTP error envelope has `code: "TvNotSupported"`, status 501

#### Scenario: Log correlates raw and mapped signals

- **WHEN** any raw WS close code or `ms.error` payload is received
- **THEN** it appears in a log line at level `warn` with the session connect id — but not in any HTTP response body

### Requirement: Session ties to discovery lifecycle

When `upnp-tv-discovery` marks a UDN offline, the back-end SHALL tear down that UDN's session and transition its state to `Offline`. When the same UDN comes back online, the session SHALL transition to `Disconnected` and stay there until the user calls `connect`.

#### Scenario: Discovery offline triggers Offline

- **WHEN** a UDN transitions to `status: "offline"` in the discovery registry while its session is `Connected`
- **THEN** the session pool is closed, session state becomes `Offline`, and clients receive a `session` WebSocket event with `state: "Offline"`

#### Scenario: Discovery back online returns to Disconnected

- **WHEN** a UDN in `Offline` state flips back to discovery `online`
- **THEN** the session state becomes `Disconnected` and no automatic reconnect fires — the user must call `connect`
