## Why

Capability **C1** (`docs/capabilities.md`) — the mytv app has no runnable substrate yet. Every subsequent capability (mDNS, UPnP discovery, TV connection, remote/volume/input control, error surfacing) needs a Fastify server, a front-end shell, a shared transport contract, structured logging with `AccessToken` redaction, and a JSON error envelope. Without this foundation each downstream change would reinvent transport, logging, and error shape — and `AccessToken` leaks are almost guaranteed.

This proposal also nails down the **single-origin architecture** — the Fastify back-end serves the compiled SPA at `/`, the API under `/api`, and the WebSocket at `/ws`. That is what makes `http://mytv.local/` a valid entry point for a browser (see `FR-HOSTING-01/02/03`).

## What Changes

- Introduce Fastify 5 back-end boot with three concerns on one port:
  - `GET /api/health` (liveness) and `/api/*` route prefix reserved for downstream capabilities.
  - `/ws` WebSocket channel reserved for push events (discovery deltas, connection state) — no message contracts locked in yet, just the mount point.
  - Static SPA hosting: serve `front-end/dist/**` on `/`; wildcard fallback to `index.html` for unknown paths so client-side routing and deep links resolve (`FR-HOSTING-03`).
- Add a Pino logger with a redactor that strips `AccessToken` from every log line and includes `correlationId` on every request/response.
- Standardise the JSON error envelope: `{ code, message, correlationId }`. Registered as a Fastify error handler so any thrown error emerges in this shape (`FR-ERROR-02`, `FR-ERROR-03`).
- Front-end shell already scaffolded (React 19 + Vite + Orbit DS wired). This change wires it to relative-path HTTP calls (`/api/…`, `/ws`), configures the Vite dev proxy so the same relative paths work in `npm run front:dev`, and drops a small typed `apiClient` in the front-end that all future capabilities use.
- No feature UI yet — the SPA renders the existing two-screen shell against sample devices. This change is deliberately UI-inert.

## Capabilities

### New Capabilities

- `platform-foundation`: single-origin Fastify server + front-end shell + shared transport, logging, and error contract that every other capability plugs into.

### Modified Capabilities

<!-- None. This is the first proposal in the plan. -->

## Impact

- **Requirements covered**: `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05`, `FR-HOSTING-01`, `FR-HOSTING-02` (HTTP half; the mDNS half of "reachable at http://mytv.local/" ships in change `mdns-advertisement`), `FR-HOSTING-03`, `FR-ERROR-02`, `FR-ERROR-03`.
- **Requirements deferred**: `FR-ERROR-01` (user-facing error surfacing UI) — belongs to change `error-surfacing`.
- **Code**: adds `back-end/src/app.ts` (Fastify bootstrap), `back-end/src/logger.ts`, `back-end/src/errors.ts`, `back-end/src/plugins/static-spa.ts`, `back-end/src/routes/health.ts`; adds `front-end/src/api/client.ts`; edits `front-end/vite.config.ts` (dev proxy).
- **Dependencies added**: `fastify`, `@fastify/static`, `@fastify/websocket`, `pino`, `pino-pretty` (dev).
- **Downstream unlocked**: every other capability (`mdns-advertisement`, `upnp-tv-discovery`, `device-list-ui`, `tv-connection-lifecycle`, `remote-control-keys`, `volume-control`, `input-management`, `error-surfacing`).
- **Non-goals** (from `docs/product-brief.md` "Future scope"): user authentication, cloud connectivity, remote Internet access, mobile applications, analytics, plugin system. Also non-goals for this specific change: any TV I/O, any discovery, any UI feature — those live in downstream capabilities.
