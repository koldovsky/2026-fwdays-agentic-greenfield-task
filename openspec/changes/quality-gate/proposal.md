## Why

Phases 1–7 delivered the full MVP feature set (shell, search, routing, map, sidebar), but most non-functional requirements remain `proposed` in `docs/requirements.md`. Without a dedicated quality pass, performance, observability, developer workflow, and demo-readiness targets are unverified and the lab cannot confidently claim BC-DEMO-01 traceability.

## What Changes

- Add a unified CI script (`npm run check` or equivalent) running lint, TypeScript, Vitest, and production build within NFR-DX-01 budget
- Document a requirement trace matrix mapping every `FR-*`, `NFR-*`, and `BC-*` to an automated test or explicit manual check
- Run Lighthouse Performance on the production build and record mobile/desktop scores against NFR-PERF-01 (≥ 90)
- Re-verify route-engine segmentation stays under NFR-PERF-02 (50 ms) with existing Vitest performance test
- Perform a console-audit pass on the happy path (load → search → submit → view map/sidebar) for NFR-OBS-01
- Update `docs/requirements.md` statuses for verified NFRs and remaining shell/brand items where evidence exists
- Add GitHub Actions workflow (or document local-only gate if CI is out of scope — prefer workflow)
- Fix any regressions discovered during the gate (bundle size, console noise, missing attribution) without expanding MVP scope

## Capabilities

### New Capabilities

- `quality-gate`: Automated check script, requirement traceability matrix, Lighthouse verification procedure, and console-audit checklist for MVP demo readiness (NFR-PERF-01, NFR-PERF-02 re-verify, NFR-OBS-01, NFR-DX-01, BC-DEMO-01)

### Modified Capabilities

<!-- No product behavior changes — verification only -->

## Impact

- **Scripts:** `package.json` — add `check`, optional `typecheck`; may add Lighthouse runner script
- **CI:** `.github/workflows/` — quality workflow on push/PR
- **Docs:** `docs/requirements.md` status updates; new `docs/test-plan.md` or section in README with requirement-ID matrix
- **Tests:** extend or document existing Vitest coverage gaps; no new product features
- **Cross-cutting:** NFR-PERF-01, NFR-PERF-02, NFR-OBS-01, NFR-DX-01, BC-DEMO-01; may flip FR-SHELL-*, BC-BRAND-* to `shipped` after manual verification
