# Capabilities & implementation order

Companion to `docs/requirements.md` (source of truth for FR/NFR/BC IDs) and `docs/product-brief.md` (product vision). This document slices those requirements into **capabilities** — each one sized to be a single OpenSpec change (`openspec-propose` → `openspec-apply-change` → `openspec-archive-change`) — and orders them so we build dependencies before dependents.

Every capability lists the requirement IDs it covers so nothing is lost in the split. When a capability ships, the mapped FR/NFR/BC IDs move from "planned" to "delivered".

## How this maps to OpenSpec

- One row in the table = one OpenSpec change proposal (title = capability name).
- Requirement IDs in the "Covers" column become the acceptance criteria inside that proposal.
- Cross-cutting NFRs and BCs (offline operation, no cloud, no auth, memory/startup budgets) are inherited by every capability — they are not their own change.
- Phases below define hard ordering; capabilities inside a phase can be built in parallel.

## Capability catalogue

| ID   | Capability                | One-liner                                                                  | Covers                                             | Depends on              | Phase |
| ---- | ------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- | ----- |
| C1   | Platform foundation       | Backend Fastify server that serves both the HTTP + WebSocket API and the compiled SPA from a single origin; front-end SPA shell wired to relative-path calls; structured logging with `AccessToken` redaction; JSON error envelope. | NFR-01, NFR-02, NFR-04, NFR-05, FR-HOSTING-01, FR-HOSTING-02, FR-HOSTING-03, FR-ERROR-02, FR-ERROR-03 | —                       | 0     |
| C2   | mDNS advertisement        | Announce the service as `mytv.local`; recover the advertisement across network changes.                                    | FR-MDNS-01, FR-MDNS-02, FR-MDNS-03                 | C1                      | 0     |
| C3   | UPnP TV discovery         | Continuously discover Samsung TVs on the LAN; de-duplicate by `UDN`, also collapse multiple UPnP UDNs on the same IP into one row; mark disappeared TVs offline.                          | FR-DISCOVERY-01…05                                 | C1                      | 1     |
| C4   | Device list UI            | Two-screen SPA's list screen: name, model, IP, connection status per discovered TV.                                         | FR-UI-01…05                                        | C3                      | 1     |
| C5   | TV connection lifecycle   | Establish/tear down a Samsung Smart View WebSocket session per TV; enforce one-connection-per-TV; auto-reconnect on unexpected disconnect; publish `Connected / Connecting / Disconnected / Offline` state. | FR-CONNECTION-01…04                                | C3                      | 2     |
| C6   | Remote control keys       | Send Samsung Smart View key presses; return success/failure per command; disable UI while disconnected.                     | FR-REMOTE-01…04                                    | C5                      | 3     |
| C7   | Volume control            | Volume up / down / mute / unmute; render current volume level when the TV reports it.                                       | FR-VOLUME-01…04                                    | C5                      | 3     |
| C8   | Input management          | List available inputs, switch active input, refresh input list on demand.                                                   | FR-INPUT-01…03                                     | C5                      | 3     |
| C9   | Error surfacing           | User-facing presentation of communication failures (toast/banner), mapped from the back-end domain error union.             | FR-ERROR-01 (rounds out FR-REMOTE-03)              | C1 (stub) → C6/C7/C8 (real content) | 4 |
| C10  | TV browser launch         | Open a user-typed URL in the TV's built-in Tizen browser via `ms.channel.emit` → `ed.apps.launch`; replaces the placeholder `AppShortcut` row on `RemoteScreen` with an inline URL `Input` + "Open" `Button` composed from existing DS primitives. | FR-BROWSER-01, FR-BROWSER-02, FR-BROWSER-03        | C5, C9                  | 5     |

## Phase 0 — Foundation

Nothing user-visible yet; everything else needs this substrate. Can run in parallel.

- **C1 Platform foundation.** Fastify 5 app boot; API mounted under `/api`, WebSocket at `/ws`, everything else served as the compiled SPA from `front-end/dist/` with an `index.html` fallback for unknown routes (FR-HOSTING-01/02/03). Health endpoint, Pino logger with a redactor for `AccessToken`, JSON error envelope `{ code, message, correlationId }`. Front-end: Vite/React shell scaffolded, Orbit DS wired (already done); HTTP calls use relative paths so the same code works behind the dev proxy and in production. Deliverables let every subsequent capability plug in without inventing its own logging/error/transport shape. Verification: `npm run back:build` + `npm run front:build`, run the back-end and confirm `curl http://localhost:PORT/` returns the SPA and `curl http://localhost:PORT/api/health` returns JSON; hit an intentionally broken endpoint and confirm the envelope + log line + redaction.
- **C2 mDNS advertisement.** `mytv.local` announced from the backend on startup; re-advertise on interface change events. Verification: `dns-sd -B _http._tcp .` (macOS) or `avahi-browse -r _http._tcp` (Linux) shows the service; unplug/replug Wi-Fi and confirm recovery. No dependency on C3 — the service is discoverable before it has any TV to control.

**Exit criterion for Phase 0**: a user on the LAN can open `http://mytv.local/` and see the (empty) SPA. No TVs yet.

## Phase 1 — Devices visible

- **C3 UPnP TV discovery.** Backend runs an M-SEARCH loop every 30 s per FR-DISCOVERY-03, plus listens to SSDP NOTIFY for immediate joins. Fetch device description, extract `UDN`, filter for Samsung TVs. Publish additions/removals over the WebSocket. Persist last-seen so a TV that vanishes flips to `Offline` (FR-DISCOVERY-04). Uses `UDN` — not IP — as the stable identity so an IP-lease change doesn't create a duplicate row.
- **C4 Device list UI.** `DeviceListScreen` composed from Orbit `DeviceCard` + `Badge`; subscribes to the discovery WebSocket for live updates. Manual-add-by-IP is called out in `docs/product-brief.md` but does *not* appear in `requirements.md` — see "Requirement gaps" below.

**Exit criterion for Phase 1**: opening `mytv.local` shows a live list of TVs on the network, with status badges that update as TVs come and go.

## Phase 2 — Session lifecycle

- **C5 TV connection lifecycle.** Session state machine per TV: `Disconnected → Connecting → Connected → Disconnected` (plus `Offline` when discovery drops it). One Samsung Smart View WebSocket connection per TV, serialized state-changing commands per TV. Auto-reconnect with backoff on unexpected close. State published over WebSocket so the UI can gray out controls (FR-REMOTE-04 setup). This is the pivot: everything in Phase 3 sends commands through the session this capability owns.

**Exit criterion for Phase 2**: selecting a TV in the list transitions it through `Connecting → Connected`, and killing the TV mid-session flips it back to `Disconnected` and then `Connecting` on reconnect.

## Phase 3 — Control commands (parallel)

Any of these three can be built independently once C5 exists.

- **C6 Remote control keys.** Backend sends `ms.remote.control` messages under the Smart View WS envelope. One HTTP endpoint per key or one endpoint with a `key` param — decide during proposal. Front-end Orbit `DPad`, transport `IconButton` row, `AppShortcut` row wired up. Disabled state honoured while `!= Connected`.
- **C7 Volume control.** Backend sends `ms.remote.control` with `KEY_VOLUP` / `KEY_VOLDOWN` / `KEY_MUTE` under the Smart View envelope. UI: Orbit `Slider` + mute `IconButton`. Volume-level display (FR-VOLUME-04) only when the TV reports it — otherwise the slider is a write-only control.
- **C8 Input management.** Backend list-inputs + set-input methods; UI reveals a picker (Orbit primitives — likely a `Modal` list). Refresh-on-demand triggers a fresh list query. Rarely-changing data, so no live subscription needed.

**Exit criterion for Phase 3**: a paired TV can be fully driven — keys, volume, input switch — from the web UI, with each command returning success/failure to the user.

## Phase 4 — Cross-cutting polish

- **C9 Error surfacing.** A single UI pattern (Orbit toast/banner — extend the DS if needed) for the domain error union `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`. Command capabilities in Phase 3 should already funnel through this pattern; C9 is the coverage sweep + copy pass. Never leak raw `-32xxx` codes to the UI (house rule from `AGENTS.md`).

## Phase 5 — Post-MVP capabilities

The MVP roster stops at C9. Anything past that opens the "future scope" doors listed in `docs/product-brief.md`; each Phase 5 capability should re-open one deliberately, with its own proposal that names the door it's opening.

- **C10 TV browser launch.** First Phase-5 capability. Adds `POST /api/devices/:udn/browser { url }` that enqueues one `ms.channel.emit` frame with an `ed.apps.launch` payload aimed at `org.tizen.browser` — a **new wire-envelope family** for this repo (all prior C6/C7/C8 traffic uses `ms.remote.control`). On the front-end, replaces the placeholder `AppShortcut` row (`Live TV / Movies / Games / Apps`) on `RemoteScreen` with an inline URL `Input` + "Open" `Button`, both composed from existing Orbit primitives (no new DS component). Consumes C5's session queue and C9's toast pattern verbatim. Success = the frame left the back-end; observable feedback loop is the TV screen itself (Smart View is fire-and-forget). Establishes the template for future `ed.apps.launch`-based capabilities (YouTube, Netflix, etc.) once the envelope is verified on real hardware.

## Requirement gaps to flag before proposing changes

- **Manual TV entry by IP** is described in `docs/product-brief.md` (workflow, MVP list, end-to-end usage) but has no `FR-*` ID in `docs/requirements.md`. Before starting C4 or C5, add `FR-DISCOVERY-06` (or similar) so the manual-add path has traceable acceptance criteria. Otherwise C4's Add-a-TV modal is undocumented behaviour.
- **Power control** is listed as a core workflow in the product brief but has no FR. Add an ID and slot it into C6 (Remote control keys) or split off if power-on requires WoL/RS-232 fallbacks beyond IP Control's reach.
- **App launching** was listed as "future" in the brief and kept out of scope for C1–C9. The Phase-5 opener is **C10 TV browser launch** — a narrow slice (Tizen browser only) that establishes the `ms.channel.emit` → `ed.apps.launch` envelope. Broader app launching (YouTube, Netflix, etc.) is deferred to follow-up post-MVP capabilities once C10 is verified on real hardware.
- **NFR budgets** (memory <300 MB, startup <15 s) are quality gates, not capabilities. Each capability's OpenSpec proposal should reference the relevant NFRs as acceptance thresholds so we do not discover them at the end.
- **BC-04 (no auth in MVP)** and **BC-05 (no cloud)** are absorbed into `AGENTS.md` house rules; they don't need their own capability but every proposal should re-affirm them.

## Suggested per-capability OpenSpec change template

For each row in the catalogue, an `openspec-propose` invocation should produce:

1. **Change summary** — one paragraph in the shape of the "One-liner" column.
2. **Requirements covered** — bullet list of the FR/NFR/BC IDs from "Covers".
3. **Dependencies** — the "Depends on" IDs, so the proposer refuses if a prereq change is not yet archived.
4. **Design notes** — protocol references (link the `samsung-ip-control-protocol` skill for C3/C5/C6/C7/C8) and DS references (link `frontend-design-check` + `DESIGN.md` for anything with a UI slice).
5. **Acceptance tests** — one test per FR the change covers, plus the NFR gates that apply.
6. **Out of scope** — quote from the brief's "Future scope" list; do not let scope creep pull those in.
