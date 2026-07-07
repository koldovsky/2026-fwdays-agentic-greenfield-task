## MODIFIED Requirements

### Requirement: Single-origin Fastify server

The back-end SHALL run a single Fastify 5 process that serves the HTTP API, the WebSocket channel, and the compiled front-end SPA from one origin and one port. When the `PORT` environment variable is unset, the process SHALL bind TCP port `80` by default so the reachable URL matches `http://mytv.local/` without extra client configuration. When `PORT` is set to any valid TCP port, the process SHALL bind that port instead. Covers `FR-HOSTING-01`, `FR-HOSTING-02`, `NFR-01`, `NFR-04`.

#### Scenario: API responds under /api

- **WHEN** a GET request is made to `/api/health`
- **THEN** the server responds `200` with `application/json` body `{ "status": "ok" }`

#### Scenario: SPA served at root

- **WHEN** a GET request is made to `/` with `Accept: text/html`
- **THEN** the server responds `200` with the contents of `front-end/dist/index.html`

#### Scenario: WebSocket upgrade succeeds at /ws

- **WHEN** a client opens a WebSocket connection to `/ws`
- **THEN** the server completes the HTTP-101 upgrade handshake and the connection stays open until the client closes it

#### Scenario: Default port is 80

- **WHEN** the process starts with `PORT` unset in the environment
- **THEN** the resolved listen port is `80` and the startup log line reports `http://<host>:80`

#### Scenario: PORT env var overrides the default

- **WHEN** the process starts with `PORT=3000` in the environment
- **THEN** the resolved listen port is `3000` and the server accepts requests on that port