# Current state

Running handoff between agent sessions. **Newest entry on top.** Each session that changed the repo prepends one heading with an ISO-8601 UTC timestamp, followed by what was done, files or areas touched, and any follow-ups the next session should know about. Rule lives in `AGENTS.md` → "Session log". Read-only sessions do not need an entry.

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
