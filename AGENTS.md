# AGENTS.md

Static context for AI agents working in this repo. Load this at the start of every session; do not duplicate its content into prompts.

## Project

**mytv** — a self-hosted Samsung TV remote for a local network. Runs on an Orange Pi, advertises itself as `mytv.local` over mDNS, discovers Samsung Smart TVs over UPnP, and controls them via the Samsung Smart View WebSocket protocol (port `8001`, consumer Tizen TVs 2016+ — see `back-end/README.md` → "TV connection lifecycle"). The Fastify back-end serves the compiled React SPA and the HTTP/WebSocket API from a **single origin** (`http://mytv.local/`), so there are no CORS or cross-port concerns in production. Two screens: **device list** and **remote**. No cloud, no accounts, no internet required at runtime. Full brief in `docs/product-brief.md`.

## Repo layout

| Path                                  | What lives there                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `back-end/`                           | Fastify 5 + TypeScript service. Discovery, Samsung Smart View WebSocket client, HTTP API and WebSocket for the front-end, **and static hosting of the built SPA** (serves `front-end/dist/` in production; SPA-fallback to `index.html`). |
| `front-end/`                          | React 19 + Vite + TypeScript SPA. Consumes the Orbit TV Remote design system via `@ds` alias. Built output (`front-end/dist/`) is served by the back-end at `/` in production; Vite dev server (`npm run front:dev`) is only used during local development. |
| `docs/samsung-ip-control-protocol/`   | Samsung HTV IP Control v2.8 PDF spec + Postman collection. **Historical reference only** — hotel/commercial TV protocol, not used by this repo (see `AGENTS.md` → Skills → `samsung-smart-view-protocol`). |
| `docs/orbit-tv-remote-design-system/` | Orbit design system (tokens, components, UI kit). Symlinked into `.claude/skills/orbit-tv-remote-design`.                                                 |
| `docs/product-brief.md`               | Product vision, users, MVP scope, non-goals.                                                                                                              |
| `DESIGN.md`                           | Front-end design brief — how the Orbit DS is wired into the app and the visual rules to follow.                                                           |
| `.claude/skills/`                     | Project-scoped Claude Code skills.                                                                                                                        |
| `package.json` (root)                 | Monorepo root — agent tooling (`metaskills`), proxy scripts (`back:*`, `front:*`, `install:all`, `skills:sync`). Not a workspace root; each subpackage installs independently. |

## Skills — when to load

Skills live under `.claude/skills/**/SKILL.md`. Load only when triggers match — don't pull them into unrelated tasks.

- **`samsung-ip-control-protocol`** — **hotel/commercial TV (HTV) reference; not applicable to the consumer Tizen TVs this repo targets.** Covers ports (1515/1516), JSON-RPC 2.0, TLS caveats — none of which apply here (see `samsung-smart-view-protocol` below). Kept for historical reference only; do not load it for TV I/O work.
- **`samsung-smart-view-protocol`** *(not yet written)* — the protocol this repo actually uses: Samsung Smart View WebSocket, port `8001`, name-based pairing, `ms.remote.control` message envelope. Until this skill exists, the authoritative source is `openspec/changes/archive/2026-07-04-tv-connection-lifecycle/` (state machine, HTTP/WS surface) plus `smart-view-ws-transport`'s `design.md` decisions D1 (transport) and D2 (pairing) once that change is archived. Load/read those before editing `back-end/src/tv/**`.
- **`frontend-design-check`** — load **first**, before touching any `front-end/**` file (`.tsx`/`.jsx`/`.ts`/`.css`/`.html`). Design gate: instructs you to consult the DS + `DESIGN.md` before making changes and lists the rules front-end code must follow. Do not load for `back-end/**`, docs, or DS source under `docs/orbit-tv-remote-design-system/**`.
- **`orbit-tv-remote-design`** — the design system itself; load when actually implementing UI (after `frontend-design-check` has told you to). Neumorphism (soft UI): one flat surface color, depth from paired raised/inset shadows, warm-orange accent reserved for one primary action per screen, Montserrat throughout, Material Symbols Rounded for every icon. Full token and component catalog inside the skill; project-level summary in `DESIGN.md`.
- **`metaskills/*`** (symlinked from the npm package) — Metarhia JS conventions, error handling, etc. Load when writing new JS/TS if the style is unclear.

## House rules

These are enforceable across tasks — apply without needing to be told each time.

### Security & privacy
- **Never send the TV pairing token to the front-end.** It stays in `back-end/` config + logs-with-redaction. If you catch yourself passing it through an API response, stop.
- **No cloud services, no analytics, no telemetry.** The product principle is local-first — anything that dials home is a bug.
- Log an HTTP `correlationId` on request and response for correlation; strip the pairing `token`/`AccessToken` from every log line regardless of nesting depth, including from any logged URL's `token=` query fragment.

### Back-end
- The wire protocol is Samsung Smart View WebSocket (port `8001`), not the hotel-TV IP Control PDF — see `samsung-smart-view-protocol` above for where the ground truth lives until that skill is written.
- One WebSocket connection per TV; serialize state-changing commands per TV; Smart View commands are fire-and-forget (no per-call response id, so no batching concept applies).
- Use `UDN` (uuid from UPnP description) as the stable TV identity, not IP — and note discovery collapses multiple UPnP UDNs sharing one IP into a single row (a single physical TV can advertise more than one UPnP root device).
- Map TV errors to a domain error union (`TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`). Never leak raw wire-level codes/events to the UI.

### Front-end
- **Prefer DS components over ad-hoc CSS.** Every UI element should come from `@ds/components/**`. If a needed primitive is missing, extend the DS (same shadow system), don't inline styles. The `@ds/ui_kits/**` screens are a `window.*`-scoped click-through demo — read them for reference, don't import them.
- Import DS primitives with explicit `.jsx` extension: `import { Button } from '@ds/components/core/Button.jsx'`.
- Use tokens (`var(--base-100)`, `var(--fg-1)`, `var(--accent)`, `var(--nm-raised-md)`, `var(--nm-inset-sm)`, `var(--radius-md)`, `var(--font-sans)`, …) — never hard-code the palette or shadow strings. Dark mode ships as-is via `[data-theme="dark"]` on `<html>`; do not fork it.
- Neumorphism rules from the DS: **one** flat surface color shared by background, cards, and buttons; depth from paired raised/inset shadows only; no borders (except the `ghost` button hairline and 2px error ring); no glass/blur (except the Modal scrim); no gradients on backgrounds. Radii are soft (12/18/26/32px) — nothing hard-cornered.
- Accent (`--accent`, warm orange) is reserved for **one** primary action per screen plus live/active states. Semantic status colors are small dots/pills, never large fills.
- Montserrat only for every string. Numbers (IP, volume, channel) share the same family — no monospace secondary face.
- Icons are Material Symbols Rounded only, rendered via `<span className="material-symbols-rounded">…</span>`. No emoji, no custom SVGs, no logo (the product name renders as plain Montserrat type).
- UI copy is English, sentence case, second person ("Your TVs", "Add a TV"). Overline labels are uppercase with wide tracking (e.g. "LOCAL NETWORK"). Button labels 1–3 words. No emoji.

### Cross-cutting
- Front-end must not talk directly to TVs — always through the back-end HTTP API.
- Keep the two subpackages independent — no shared code except through explicit HTTP contracts.
- **Single origin in production.** Fastify serves the API and WebSocket **and** the SPA (`front-end/dist/`) at `http://mytv.local/`. Front-end HTTP calls use relative paths (e.g. `/api/…`, `/ws`) — never hard-code `http://localhost:...` or a separate host. Mount the API under a distinct prefix (`/api`) so the SPA-fallback route can safely wildcard the rest.
- **Dev workflow.** Run `npm run back:dev` and `npm run front:dev` in parallel: Vite serves the SPA on its own port with HMR and proxies `/api` + `/ws` to Fastify. Production builds run `npm run front:build` first, then the back-end serves the resulting `front-end/dist/`.
- When adding a Smart View command, check `openspec/changes/archive/*-smart-view-ws-transport/design.md` D1 for the message envelope shape before writing types — the `docs/samsung-ip-control-protocol/` Postman collection is for the unrelated hotel-TV protocol.

### Session log
- **Before ending any session that changed the repo, prepend a new entry to `docs/current-state.md`.** Newest entry on top. Format: `## <ISO-8601 UTC timestamp>` heading (get it with `date -u +"%Y-%m-%dT%H:%M:%SZ"`), then a short summary of what the agent did, the files or areas touched, and any follow-ups the next session should know about. The file is the running handoff between sessions — read it at the start of a new session before making assumptions about repo state.
- Read-only sessions (questions, code review with no edits) do **not** need an entry.

## Verification

Before reporting a task done:

- **Back-end changes**: `npm run back:build` from repo root passes. If the change touches TV I/O, at minimum document the manual repro (curl against a mock).
- **Front-end changes**: `npm run front:build` from repo root passes; open the dev server (`npm run front:dev`) and eyeball the affected screen — visual regressions in neomorphic surfaces are silent in TS/lint.
- **Tests are required, not optional, whenever the change's own `tasks.md` adds them.** If a task says "add an integration test" / "add a unit test" / etc., checking that task off requires the test to exist **and pass** — run it via `npm run back:test` / `npm run front:test` from repo root. A test task marked `[x]` with no passing test run is not done.
- If `npm run back:test` / `npm run front:test` fails because no `test` script is defined yet in that package's `package.json`, that itself is a gate failure for any change whose `tasks.md` calls for tests — wire up the script (e.g. `tsx --test src/**/*.test.ts` for the back-end) as part of implementing those tasks, don't skip past the missing script.
- Never claim UI works, or that a feature is correct, from a build alone.
