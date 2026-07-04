## Context

mytv is a two-package monorepo (`back-end/` Fastify, `front-end/` React+Vite) that must run on an Orange Pi over a LAN. `AGENTS.md` and `docs/product-brief.md` commit us to: single origin (`http://mytv.local/`), no cloud, no auth, no internet at runtime, and `AccessToken` never crossing the wire to the front-end. `docs/capabilities.md` places this change at Phase 0 — nothing else can start until this substrate exists.

Current state: `back-end/` is a stub (`ls back-end/` shows `src/`, `tsconfig.json`, `package.json` — no Fastify boot yet). `front-end/` has the Orbit DS wired via `@ds` and renders a two-screen shell against sample devices, but makes no HTTP calls yet. The `back:build` and `front:build` scripts pass today.

## Goals / Non-Goals

**Goals:**
- Fastify 5 process that serves API + WebSocket + SPA on one port with a wildcard SPA fallback.
- One canonical error shape (`{ code, message, correlationId }`) enforced by a Fastify error handler — downstream capabilities never invent their own.
- Structured logging (Pino) with a redactor that strips `AccessToken` from every log line before it leaves the process, plus a `correlationId` propagated through request and response logs.
- Front-end HTTP indirection via a single `apiClient` module using relative paths, so dev (Vite proxy) and prod (Fastify same-origin) share code paths.
- Vite dev proxy for `/api` + `/ws` so `npm run front:dev` mimics prod.

**Non-Goals:**
- No TV I/O (belongs to `tv-connection-lifecycle` and command capabilities).
- No discovery (`upnp-tv-discovery`, `mdns-advertisement`).
- No user-facing error UI (`error-surfacing`) — this change only guarantees the envelope shape.
- No auth, rate limiting, CSRF, or CORS config beyond same-origin default (BC-04, single-origin architecture).
- No structured message schema for WebSocket yet — just the mount point and a heartbeat; downstream capabilities define their own message types.

## Decisions

### D1 — Route layout: `/api/*` + `/ws` + `/*` SPA fallback

Fastify registers plugins in this order:

1. `@fastify/websocket` mounted at `/ws`.
2. API routes registered with a `/api` prefix (starts empty; downstream changes add resources).
3. `@fastify/static` serving `front-end/dist/` with a `wildcard: false` root, so it does not swallow unknown paths.
4. A `setNotFoundHandler` that, for GET requests without an `/api/` or `/ws` prefix, streams `front-end/dist/index.html` — this is the SPA fallback (`FR-HOSTING-03`).

**Alternative considered:** put everything under `/`, dispatch by content negotiation or accept header. Rejected — brittle, and impossible for the SPA-fallback plugin to distinguish a missing API route from a client-side route.

### D2 — Single Fastify instance, single port

One process, one port (defaults to `PORT=3000`; in prod on the Pi bound to `PORT=80` via env). No reverse proxy. This is what makes `http://mytv.local/` a single origin and eliminates CORS in prod (`FR-HOSTING-01`).

**Alternative considered:** run Fastify on `:3000` and a static file server on `:80`. Rejected — two processes to supervise, an extra CORS surface, and it breaks the "open http://mytv.local" UX contract in the brief.

### D3 — Pino + Fastify built-in logger, with a redactor for `AccessToken`

Fastify's built-in `logger` accepts a Pino instance. Configure `redact: { paths: ['req.headers.authorization', 'AccessToken', '*.AccessToken', '**.AccessToken'], remove: true }` so any object we log — including the raw JSON-RPC frame from IP Control (comes later) — has the token removed before serialization.

Every request gets a `correlationId` (UUID v4) attached to `req.id` via `genReqId`; response logs echo it. This is what downstream capabilities pin their per-command traces to.

**House rule** from `AGENTS.md`: log the JSON-RPC `id` on both request and response. The correlationId is separate from that JSON-RPC `id` — one is HTTP-request-scoped, the other is per-outbound-JSON-RPC-call — so both appear in logs when the TV protocol lands in a later change.

### D4 — JSON error envelope

Registered via `setErrorHandler`. Any thrown `Error` gets mapped to:

```json
{ "code": "internal", "message": "…", "correlationId": "…" }
```

Downstream capabilities can throw typed errors (`HttpError.badRequest('…')`, `HttpError.notFound('…')`) that pick their own `code` and status. Fastify validation errors get `code: "validation"`. Unknown errors get `code: "internal"` and are logged with stack — but the response never leaks a stack (`FR-ERROR-02` — never crash; `FR-ERROR-03` — logged).

The domain error union for TV protocol errors (`TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`, from `AGENTS.md`) is out of scope of this change but will map into this envelope in `tv-connection-lifecycle`.

### D5 — Front-end `apiClient`

A ~40-line module in `front-end/src/api/client.ts` that:

- Uses relative paths (`fetch('/api/health')`) so dev proxy and prod same-origin share code.
- Parses the JSON envelope; on non-2xx throws a typed `ApiError` with `code`, `message`, `correlationId`.
- Exposes `apiClient.get<T>(path)` and `apiClient.post<T>(path, body)`; downstream capabilities add methods as needed.

Never hard-code a host or port here. Hard-coding `http://localhost:3000` is an anti-pattern — the same code runs behind Vite's proxy in dev and behind Fastify's own routes in prod.

### D6 — Vite dev proxy for `/api` and `/ws`

`front-end/vite.config.ts` gets a `server.proxy` block for `/api` (HTTP) and `/ws` (WebSocket, `ws: true`). Both target `http://localhost:${BACK_PORT}` where `BACK_PORT` reads from an env with default `3000`.

## Risks / Trade-offs

- [Fastify plugin ordering fragility] → SPA fallback registered as `setNotFoundHandler` after `@fastify/static` and API routes. Add an integration test that asserts `GET /api/health` → JSON and `GET /deep/route` → `index.html`.
- [Log redactor incomplete for nested tokens] → Pino redact paths are wildcarded (`**.AccessToken`) but Pino wildcards do not descend arrays by default. Mitigation: a targeted unit test that logs `{ req: { body: { params: [{ AccessToken: 'S3CR3T' }] } } }` and asserts the serialized output has no `S3CR3T`.
- [`front-end/dist` may not exist when back-end starts in dev] → Guard the static plugin registration behind an env flag (`SERVE_SPA=1`, defaults on). In dev the front-end runs on Vite anyway; the back-end without SPA is fine.
- [`PORT=80` on the Pi requires root or CAP_NET_BIND_SERVICE] → Document in `back-end/README.md` (created by this change): production run uses `setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))` or a `PORT=8080` + iptables redirect. Not blocking for the substrate.
- [Vite proxy `ws: true` requires HTTP upgrade support] → Included in default Vite proxy behaviour; verify with a smoke test in a task below.

## Migration Plan

No production deployment yet — this is the first change. Rollback strategy: `git revert`. No data migration required.

## Open Questions

None blocking. Downstream: whether to introduce a shared TypeScript types package for the HTTP contract. Deferred until the first downstream capability actually shares a type across both packages.
