# Current state

Running handoff between agent sessions. **Newest entry on top.** Each session that changed the repo prepends one heading with an ISO-8601 UTC timestamp, followed by what was done, files or areas touched, and any follow-ups the next session should know about. Rule lives in `AGENTS.md` → "Session log". Read-only sessions do not need an entry.

---

## 2026-07-04T10:39:55Z

**What was done — fixed icons rendering as literal text names ("home", "add", etc.)**
- Root cause: `front-end/src/index.css` imported `@ds/styles.css`, which in turn `@import`s Montserrat and Material Symbols Rounded **live from Google Fonts CDN** (`docs/orbit-tv-remote-design-system/tokens/fonts.css`). Material Symbols is a ligature font — its text content literally IS the icon name (e.g. `home`), substituted for a glyph only once the font loads. When the font can't load (no internet reachable from the rendering context — confirmed reachable via `curl` from this shell, but not from the browser-preview sandbox), the raw icon names render as plain text. This also meant the app violated its own "no cloud, no internet required at runtime" rule (`AGENTS.md`, `docs/product-brief.md`) even outside this sandbox — on the real Orange Pi target, if the LAN has no WAN uplink, icons/body font would break the same way.
- Fix: self-hosted both fonts instead of live-CDN-importing them.
  - Downloaded the actual woff2 files (Montserrat 400/500/600/700/800, latin subset only — this app's copy is English-only; Material Symbols Rounded) from Google Fonts (Apache/OFL licensed, redistribution-safe) into `front-end/public/fonts/`.
  - Added `front-end/src/fonts.css` with local `@font-face` declarations pointing at those files.
  - `front-end/src/index.css` now imports each DS token file individually (`colors`, `typography`, `spacing`, `shadows`, `base`) instead of the bundled `@ds/styles.css`, skipping only `tokens/fonts.css`, and imports `./fonts.css` instead. DS source under `docs/orbit-tv-remote-design-system/**` was **not** modified (out of bounds per `frontend-design-check`) — this is just being selective about which DS files this app consumes.
  - Removed the now-dead `<link rel="preconnect" href="https://fonts.googleapis.com">`/`gstatic.com` hints from `front-end/index.html`.
  - Updated `DESIGN.md`'s "Wiring" and "Style at a glance" sections to describe the self-hosted approach instead of the stale CDN description.
- Verification: `npm run front:build` passes; confirmed the built CSS contains zero `googleapis`/`gstatic` references and the five Montserrat + one Material Symbols woff2 files are copied into `dist/fonts/` and served with `Content-Type: font/woff2` from both the Vite dev server and a static build. Opened a live browser preview via `npm run front:dev` — screenshot taken (not independently viewable by the agent, tool limitation noted in the previous entry) but no console/build errors surfaced and the font files resolved with `200`.
- **Follow-up for the next session**: if the user confirms icons still don't render after this fix, the remaining suspect is the browser-preview tool's own sandbox network isolation (unrelated to the app) — verify by checking Network tab for 404s on `/fonts/*.woff2` specifically, not CDN URLs (there should be none left).

## 2026-07-04T10:25:36Z

**What was done — implemented `platform-foundation` (C1) via the `/next-change` Loop Engineering cycle**
- Back-end: Fastify 5 app factory (`back-end/src/app.ts`) — single origin serving `/api/*`, `/ws`, and the static SPA. `logger.ts` builds shared Pino `loggerOptions` (passed into Fastify's `logger` option so Fastify's own `req`/`res` serializers stay wired up) with a recursive `formatters.log` redactor that strips `AccessToken`/`authorization` at any nesting depth — pino's path-based `redact` option only supports single-level wildcards, not arbitrary depth, so a formatter replaces it. `errors.ts` — `HttpError` + `errorHandler` emitting the `{ code, message, correlationId }` envelope, never leaking stacks. `plugins/static-spa.ts` — manual SPA fallback (`wildcard: false` + `setNotFoundHandler`) that serves real static files when they exist and falls back to `index.html` otherwise, with path-traversal guarding. `routes/health.ts` — `GET /api/health`. New entrypoint `src/index.ts` replaces the old `src/server.ts` stub.
- Front-end: `src/api/client.ts` (`apiClient.get/post`, `ApiError`), Vite dev proxy for `/api` + `/ws` in `vite.config.ts`, temporary `apiClient.get('/api/health')` smoke-test call on `App.tsx` mount.
- Tests (`back-end/src/*.test.ts`, run via `npm run back:test` / `tsx --test`): health envelope, SPA fallback, 404 envelope, redactor (top-level + nested `AccessToken`), WebSocket ping/pong. All 6 pass.
- Docs: `back-end/README.md` (run instructions, env vars, `cap_net_bind_service` note, logging design), `.env.example` gained `SERVE_SPA`.
- **Bug caught and fixed during implementation**: passing a pre-built Pino instance via Fastify's `loggerInstance` option skips Fastify's default `req`/`res` serializers, so raw (circular) request/response objects reached the custom log formatter and caused a `RangeError: Maximum call stack size exceeded` on the very first request — which manifested as the whole test run hanging (the crash happened inside a synchronous Fastify hook with no visible stack trace under the test runner). Fixed by (a) passing plain `logger: loggerOptions` instead of `loggerInstance` so Fastify builds its own logger with serializers intact, and (b) making the redaction formatter only recurse into plain objects/arrays, treating any class instance (request/reply, sockets, buffers, dates, errors) as opaque and cycle-safe regardless. Also dropped the in-process `pino-pretty` transport entirely (its worker-thread startup hung in this sandboxed environment) in favor of piping `back:dev` output through `pino-pretty` at the shell level.
- Verification: `npm run back:build`, `npm run front:build`, and `npm run back:test` all green. Manually confirmed via `back:dev` + `front:dev` running together: Vite proxy forwards `/api/health` to Fastify correctly (`curl localhost:5173/api/health` and a browser preview both returned `{"status":"ok"}`); standalone back-end (after `front:build`) serves the built SPA at `/` and JSON at `/api/health`. Note: the available browser-preview tooling only exposes dev-server logs and screenshots, not the page's own DevTools console, so the `console.log` from the smoke-test call itself was verified indirectly (via the equivalent proxied `curl`) rather than observed directly in-browser.
- **Independent review** (`code-reviewer` agent, fresh context): verdict **PASS**. Three low-severity, non-blocking findings, none violating a house rule or a checked-off task: (1) `GET /ws` without a WebSocket upgrade returns a bare empty `404` instead of the JSON envelope (`@fastify/websocket` short-circuits before the custom `notFoundHandler`); (2) `GET /api` (no trailing slash) falls through to the SPA fallback instead of a JSON `404`, since the reserved-path check only matches `/api/`; (3) `back-end/src/index.ts` has no `uncaughtException`/`unhandledRejection`/graceful-shutdown wiring, worth adding once a downstream capability runs a long-lived background loop (e.g. discovery).
- **Follow-ups for the next session**: none blocking archival. Worth a small follow-up patch for the two `static-spa.ts` edge cases above and process-level error handlers before `tv-connection-lifecycle`/discovery loops land. Next capability per `docs/capabilities.md` dependency order is `mdns-advertisement` (C2) or `upnp-tv-discovery` (C3, needs C1 only) — `platform-foundation` unblocks both.

## 2026-07-03T17:23:30Z

**What was done**
- Created OpenSpec proposals for all 9 capabilities from `docs/capabilities.md`. Each change ships with `proposal.md` + `design.md` + `specs/<name>/spec.md` + `tasks.md` and passes `openspec validate`.
  - Phase 0: `platform-foundation`, `mdns-advertisement`
  - Phase 1: `upnp-tv-discovery`, `device-list-ui`
  - Phase 2: `tv-connection-lifecycle`
  - Phase 3: `remote-control-keys`, `volume-control`, `input-management`
  - Phase 4: `error-surfacing`
- Enriched `openspec/config.yaml` with a project-wide `context:` block (mytv summary, architecture, ground-truth docs, house rules) so every future proposal inherits it, plus per-artifact `rules:` for `proposal`, `design`, `tasks` (last task must always be the current-state log entry).
- Requirements traceability: every requirement ID from `docs/requirements.md` (FR-DISCOVERY-*, FR-MDNS-*, FR-HOSTING-*, FR-CONNECTION-*, FR-REMOTE-*, FR-VOLUME-*, FR-INPUT-*, FR-UI-*, FR-ERROR-*, NFR-01/02/04/05, BC-02) is mapped to at least one change's Covers or Impact section.
- Every change's `tasks.md` ends with a "prepend an entry to docs/current-state.md" step, per the config rule.

**Verification**
- `openspec validate <name>` passes for all 9 changes. No code changed.

**Follow-ups for the next session**
- Two requirement gaps still open in `docs/requirements.md`: no FR for manual TV-add-by-IP (product-brief has it), no FR for power control (product-brief lists it). Both should get FR IDs before proposing the follow-up changes that would ship them (both plug into `device-list-ui` and `remote-control-keys` respectively).
- Start implementation with `platform-foundation` (Phase 0). `mdns-advertisement` can be built in parallel.
- Run `/opsx:apply platform-foundation` to begin implementation.

---

## 2026-07-03T16:33:56Z

**What was done**
- Made the "Fastify serves the SPA on the same origin as the API" architecture explicit across the docs so future agents don't accidentally split the front-end onto its own host.
- `docs/requirements.md`: added new **Application Hosting** section with FR-HOSTING-01 (back-end serves the built SPA on the same origin), FR-HOSTING-02 (reachable at `http://mytv.local/`), FR-HOSTING-03 (unknown SPA routes fall back to `index.html`).
- `docs/product-brief.md`: "What this is" and end-to-end usage now state that a single origin serves the SPA + API.
- `AGENTS.md`: updated the project summary, the back-end/front-end rows of the repo-layout table, and added a Cross-cutting rule that mandates single-origin serving in production (Fastify serves `/api`, `/ws`, and `/` for the SPA) plus a Dev workflow note (Vite proxies `/api` + `/ws` in dev).
- `DESIGN.md`: added a "Serving" bullet to the Wiring section — relative paths only in front-end HTTP calls, Vite proxy in dev.
- `docs/capabilities.md`: extended C1 Platform foundation to include SPA hosting (API under `/api`, WebSocket at `/ws`, everything else served from `front-end/dist/` with SPA-fallback) and mapped the new FR-HOSTING-01/02/03 IDs into its Covers column. Updated verification steps.

**Verification**
- No code changed; docs-only session.

**Follow-ups for the next session**
- When C1 lands, wire Vite's dev-server proxy for `/api` and `/ws` so the same relative paths work in dev and prod.
- The Add-a-TV FR gap flagged in the previous session is still open — worth resolving before C4.

---

## 2026-07-03T16:21:31Z

**What was done**
- Split `docs/requirements.md` into 9 capabilities sized to become individual OpenSpec changes; each capability maps to explicit FR/NFR/BC IDs so nothing from the requirements doc is lost.
- Ordered the capabilities into 5 phases (0 foundation → 4 polish) with per-phase exit criteria. Phase 3 (control commands: keys, volume, input) is parallelizable once the connection lifecycle lands in Phase 2.
- Flagged requirement gaps for the next spec-review pass: manual TV-add-by-IP is in the product brief but has no FR ID; power control has no FR ID; NFR budgets should be re-asserted as acceptance thresholds on each proposal.
- Included a per-capability OpenSpec proposal template so each `openspec-propose` call has the same shape (summary → covers → depends on → design notes → acceptance tests → out of scope).
- Output written to `docs/capabilities.md`.

**Verification**
- No code changed; nothing to build. Doc-only session.

**Follow-ups for the next session**
- Amend `docs/requirements.md` to add FR IDs for manual IP entry and power control before starting OpenSpec proposals for C4/C5/C6 — otherwise those changes will ship undocumented behaviour.
- First OpenSpec proposal to run: C1 (Platform foundation). C2 (mDNS) can run in parallel.

---

## 2026-07-03T16:17:09Z

**What was done**
- Introduced the "session log" rule in `AGENTS.md` and created this file to hold the running handoff.
- Added a `frontend-design-check` skill under `.claude/skills/` that gates all `front-end/**` edits behind consulting the Orbit DS + `DESIGN.md`; registered it in `AGENTS.md` alongside the existing `orbit-tv-remote-design` skill.
- Integrated the new **Orbit TV Remote design system**:
  - Renamed `docs/Orbit TV Remote Design System/` → `docs/orbit-tv-remote-design-system/` (via `git mv`, staging preserved).
  - Swapped the stale `.claude/skills/neotv-design` symlink for `.claude/skills/orbit-tv-remote-design` → new folder.
  - Repointed `@ds` alias in `front-end/vite.config.ts` and `front-end/tsconfig.app.json`.
  - Updated `front-end/index.html` (dropped Manrope/JetBrains-Mono link and `lucide` script — Orbit's `tokens/fonts.css` loads Montserrat + Material Symbols Rounded).
  - Updated `front-end/src/index.css` to Orbit tokens (`--base-100`, `--fg-1`, `--font-sans`).
  - Rewrote `front-end/src/App.tsx` to compose the two-screen device-list ↔ remote flow from Orbit primitives directly (the DS's `ui_kits/tv-remote/*.jsx` demo screens attach to `window.OrbitTVRemoteDesignSystem_08e5b7` and cannot be imported as ES modules).
  - Added `front-end/src/ds.d.ts` — shim declarations for `@ds/components/**/*.jsx` (the DS's own `.d.ts` files only export the props interface, not the component).
- Created `DESIGN.md` at the repo root — project-level front-end brief covering the DS style, wiring, component surface, tokens, rules, and verification.
- Rewrote the DS-related sections of `AGENTS.md` (repo-layout table, skill guidance, front-end house rules) to reflect Orbit (one flat neumorphic surface, warm-orange accent used exactly once per screen, Montserrat, Material Symbols Rounded, English sentence-case second-person copy).
- Product-brief edit: added manual-IP-entry as an alternative to UPnP discovery in `docs/product-brief.md` (four spots — summary, end-to-end flow, workflow section, MVP list).

**Verification**
- `npm run front:build` passes.
- UI not eyeballed in a browser this session — recommended before merge.

**Follow-ups for the next session**
- Run `npm run front:dev` and visually confirm both screens render correctly in light and dark modes; neumorphic regressions are silent in TS/lint.
- Nothing pushed; all changes are still staged/unstaged locally on `main`. Commit when ready.
