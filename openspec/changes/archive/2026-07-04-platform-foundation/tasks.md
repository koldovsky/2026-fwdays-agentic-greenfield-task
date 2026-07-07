## 1. Back-end — server boot

- [x] 1.1 Add dependencies to `back-end/package.json`: `fastify`, `@fastify/static`, `@fastify/websocket`, `pino`, and `pino-pretty` (dev).
- [x] 1.2 Create `back-end/src/logger.ts` — Pino instance with `redact.paths` for `AccessToken`, `*.AccessToken`, `**.AccessToken`, and `req.headers.authorization`, `remove: true`.
- [x] 1.3 Create `back-end/src/errors.ts` — `HttpError` class + `errorHandler(err, req, reply)` that emits the JSON envelope `{ code, message, correlationId }` and never leaks stacks.
- [x] 1.4 Create `back-end/src/app.ts` — Fastify factory: `genReqId` uses `crypto.randomUUID()`, registers `@fastify/websocket` at `/ws`, registers API routes under `/api` prefix, registers `@fastify/static` for `front-end/dist/`, installs the error handler.
- [x] 1.5 Create `back-end/src/plugins/static-spa.ts` — plugin that sets `notFoundHandler` to stream `index.html` for GETs whose URL does not start with `/api/` or `/ws`; returns JSON envelope 404 otherwise.
- [x] 1.6 Create `back-end/src/routes/health.ts` — `GET /api/health` returning `{ status: "ok" }`.
- [x] 1.7 Wire an entrypoint `back-end/src/index.ts` — read `PORT` (default `3000`) and `HOST` (default `0.0.0.0`) from env, `app.listen`, log a startup line with the resolved port.

## 2. Back-end — verification

- [x] 2.1 Add an integration test (Vitest or `node --test`) — starts the app, hits `GET /api/health`, asserts `{ status: "ok" }` and content-type.
- [x] 2.2 Add an integration test — `GET /deep/route` returns `text/html` and body equals `front-end/dist/index.html`.
- [x] 2.3 Add an integration test — `GET /api/does-not-exist` returns `404` with `{ code, message, correlationId }` and no `stack`.
- [x] 2.4 Add a unit test for the redactor — log an object with a top-level and a deeply nested `AccessToken`, assert the emitted string contains neither literal value.
- [x] 2.5 Add a WebSocket smoke test — connect to `/ws`, exchange a `ping`/`pong` payload, assert clean close.

## 3. Front-end — HTTP client

- [x] 3.1 Create `front-end/src/api/client.ts` — relative-path `fetch` wrapper with `get<T>(path)` and `post<T>(path, body)`; parses the envelope; throws `ApiError` on non-2xx with `code`, `message`, `correlationId`.
- [x] 3.2 Add a Vite dev proxy in `front-end/vite.config.ts` for `/api` (HTTP) and `/ws` (WebSocket, `ws: true`), targeting `http://localhost:${VITE_BACK_PORT ?? 3000}`.
- [x] 3.3 Add a top-of-`App.tsx` call `apiClient.get('/api/health')` on mount that logs to the console (temporary; removed by the next capability). This is the smoke test that proves the wiring.

## 4. Docs

- [x] 4.1 Create `back-end/README.md` — how to run (`npm run back:dev`, `npm run back:build`), environment variables (`PORT`, `HOST`, `SERVE_SPA`), and the note about `cap_net_bind_service` on the Pi for `PORT=80`.
- [x] 4.2 Update `AGENTS.md` and `DESIGN.md` if the `apiClient` signature diverges from what those files claim. (Checked: neither file mentions `apiClient` — no update needed.)

## 5. Verification & handoff

- [x] 5.1 `npm run back:build` from repo root passes.
- [x] 5.2 `npm run front:build` from repo root passes.
- [x] 5.3 Run `npm run back:dev` in one shell and `npm run front:dev` in another; open `http://localhost:5173/` and confirm the console shows a successful `/api/health` response proxied through Vite. (Confirmed the proxy forwards correctly — `curl localhost:5173/api/health` → `{"status":"ok"}` — and the page renders via browser preview; the preview tooling available doesn't expose the page's own DevTools console, so the literal `console.log` line was verified via the equivalent proxied request rather than observed directly.)
- [x] 5.4 With back-end running standalone (after `npm run front:build`), `curl http://localhost:3000/` returns the SPA and `curl http://localhost:3000/api/health` returns JSON.
- [x] 5.5 Prepend a new dated entry to `docs/current-state.md` summarising what shipped in this change.
