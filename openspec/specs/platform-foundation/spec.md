## Purpose

Single-origin Fastify substrate for **mytv**: one process serving the HTTP API, the WebSocket channel, and the compiled front-end SPA from one port, with structured logging (AccessToken redaction) and a uniform JSON error envelope. Every other capability (mDNS, UPnP discovery, TV connection, remote/volume/input control, error surfacing) builds on this.

## Requirements

### Requirement: Single-origin Fastify server

The back-end SHALL run a single Fastify 5 process that serves the HTTP API, the WebSocket channel, and the compiled front-end SPA from one origin and one port. Covers `FR-HOSTING-01`, `NFR-01`, `NFR-04`.

#### Scenario: API responds under /api

- **WHEN** a GET request is made to `/api/health`
- **THEN** the server responds `200` with `application/json` body `{ "status": "ok" }`

#### Scenario: SPA served at root

- **WHEN** a GET request is made to `/` with `Accept: text/html`
- **THEN** the server responds `200` with the contents of `front-end/dist/index.html`

#### Scenario: WebSocket upgrade succeeds at /ws

- **WHEN** a client opens a WebSocket connection to `/ws`
- **THEN** the server completes the HTTP-101 upgrade handshake and the connection stays open until the client closes it

### Requirement: SPA fallback for unknown routes

Unknown GET requests that do not begin with `/api/` or `/ws` SHALL be answered with the SPA's `index.html`, so client-side routing and deep links resolve. Covers `FR-HOSTING-03`.

#### Scenario: Deep link falls back to index.html

- **WHEN** a GET request is made to `/some/unknown/deep/link`
- **THEN** the server responds `200` with `text/html` and the body equals `front-end/dist/index.html`

#### Scenario: Unknown API path returns JSON 404

- **WHEN** a GET request is made to `/api/does-not-exist`
- **THEN** the server responds `404` with `application/json` body matching the error envelope shape `{ code, message, correlationId }`

### Requirement: Front-end reachable at http://mytv.local/

The front-end SHALL be reachable through a browser at `http://mytv.local/` without additional client-side configuration, given that the mDNS advertisement is active on the network. Covers `FR-HOSTING-02` (HTTP half; the mDNS half is delivered by the `mdns-advertisement` change).

#### Scenario: Browser at mytv.local loads SPA

- **WHEN** a user on the LAN opens `http://mytv.local/` in a modern browser and `mdns-advertisement` is running
- **THEN** the SPA loads and the device-list screen renders

### Requirement: Front-end uses relative HTTP paths

The front-end SHALL make all HTTP and WebSocket calls using relative paths (`/api/...`, `/ws`). Absolute hosts or ports MUST NOT appear in front-end source. Covers `NFR-02`, `NFR-05`.

#### Scenario: Client uses relative path

- **WHEN** the front-end calls the back-end from any component
- **THEN** the resulting network request URL starts with `/api/` or `/ws` and contains no host or scheme

#### Scenario: Dev server proxies to Fastify

- **WHEN** the developer runs `npm run front:dev` and the SPA calls `/api/health`
- **THEN** Vite proxies the request to the Fastify back-end and the SPA receives the JSON response

### Requirement: Structured logging with AccessToken redaction

Every log line SHALL be emitted as structured JSON through Pino, include a `correlationId` for request-scoped events, and MUST NOT contain the string value of any `AccessToken` field regardless of nesting depth. Covers `FR-ERROR-03`, and the `AGENTS.md` house rule "strip AccessToken from every log line."

#### Scenario: Redactor strips top-level AccessToken

- **WHEN** the server logs an object with `{ AccessToken: "S3CR3T" }`
- **THEN** the serialized log line does not contain the substring `S3CR3T`

#### Scenario: Redactor strips nested AccessToken

- **WHEN** the server logs an object with `{ req: { body: { params: { AccessToken: "N3ST3D" } } } }`
- **THEN** the serialized log line does not contain the substring `N3ST3D`

#### Scenario: Request and response share correlationId

- **WHEN** the server handles a request that produces a log on entry and on completion
- **THEN** both log entries carry the same `correlationId`

### Requirement: Uniform JSON error envelope

All error responses returned by the API SHALL match the shape `{ code: string, message: string, correlationId: string }`. Stack traces and raw protocol codes MUST NOT appear in the response body. Covers `FR-ERROR-02`, `FR-ERROR-03`.

#### Scenario: Uncaught error returns envelope

- **WHEN** a request handler throws an uncaught `Error`
- **THEN** the response status is `500` and the JSON body has keys `code`, `message`, `correlationId`, and no `stack` field

#### Scenario: Envelope carries the request's correlationId

- **WHEN** a request that logs `correlationId=abc-123` on entry fails
- **THEN** the error response body's `correlationId` field equals `abc-123`

#### Scenario: Server does not crash on handler error

- **WHEN** any request handler throws
- **THEN** the process continues running and handles subsequent requests normally
