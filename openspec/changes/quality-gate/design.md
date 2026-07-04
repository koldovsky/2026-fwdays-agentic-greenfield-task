## Context

Phases 1–7 shipped the MotoRoute Agent MVP: Ukrainian shell, Nominatim search, OSRM routing, Leaflet map, itinerary sidebar, and Vitest coverage for pure `lib/` modules. `docs/requirements.md` still lists many items as `proposed` despite working behavior. NFR-PERF-01 (Lighthouse ≥ 90), NFR-DX-01 (full check under 60 s), NFR-OBS-01 (silent console), and BC-DEMO-01 (traceable verification) lack a formal gate.

Constraints: no new product features; no analytics or tracking (BC-PRIVACY-01); keep keyless public APIs (NFR-COST-01); lab MVP suitable for fwdays demo submission with CodeRabbit PR review.

## Goals / Non-Goals

**Goals:**

- Single developer command runs lint, TypeScript, Vitest, and production build (NFR-DX-01)
- GitHub Actions workflow runs the same gate on push/PR
- `docs/test-plan.md` maps every MVP requirement ID to automated test file(s) or documented manual check
- Lighthouse Performance ≥ 90 recorded for mobile and desktop against production build (NFR-PERF-01)
- Confirm existing `performance.test.ts` still enforces NFR-PERF-02 (< 50 ms segmentation)
- Console-audit checklist executed on happy path; fix any `console.log` / error noise (NFR-OBS-01)
- Update `docs/requirements.md` statuses to `shipped` where evidence exists

**Non-Goals:**

- E2E browser automation (Playwright/Cypress) — manual checks documented instead
- Accessibility audit tooling beyond existing keyboard/focus implementation
- Performance optimization beyond fixes required to meet Lighthouse threshold
- GPX export, persistence, multi-stop routing, or backend services
- Replacing Vitest with another test runner

## Decisions

### 1. Check script shape (NFR-DX-01)

Add to `package.json`:

```json
"typecheck": "tsc --noEmit",
"check": "npm run lint && npm run typecheck && npm test && npm run build"
```

**Rationale:** Matches requirement wording exactly; `check` becomes the CI entry point. Separate `typecheck` aids local debugging.

**Alternative considered:** `npm-run-all` parallel lint+test — rejected; sequential matches PRD and avoids CPU contention on CI runners.

### 2. CI workflow

Create `.github/workflows/quality.yml`:

- Trigger: `push` to `main`, all `pull_request`
- Node 20, `npm ci`, `npm run check`
- Optional: cache `~/.npm`

**Rationale:** BC-DEMO-01 expects visible verification artifacts for course submission; local-only gate is insufficient for fork PR workflow.

### 3. Requirement trace matrix

New file `docs/test-plan.md` with tables:

| Requirement | Verification | Evidence |
|-------------|--------------|----------|
| FR-SEARCH-01 | Manual + unit | `location-field` debounce; `nominatim-client` tests |
| NFR-PERF-02 | Automated | `lib/route-engine/__tests__/performance.test.ts` |
| … | … | … |

Link from README project section (short pointer, not duplicate content).

**Rationale:** BC-DEMO-01 requires labeled specs → tests; central doc avoids scattering IDs only in OpenSpec archives.

### 4. Lighthouse procedure (NFR-PERF-01)

**Primary approach:** Document manual Lighthouse run against `npm run build && npm start` on `http://localhost:3000` with default route submitted (or empty state if faster). Record scores in `docs/test-plan.md` under a Lighthouse section with date and commit hash.

**Optional enhancement:** Add devDependency `@lhci/cli` and `lighthouserc.json` with `assertions: { 'categories:performance': ['error', { minScore: 0.9 }] }` if local runs are stable in CI (often flaky on GitHub runners — prefer documented manual run for lab MVP).

**Mitigations if score < 90:** defer Leaflet until results view; ensure `dynamic({ ssr: false })` on map; review bundle via Next.js analyzer only if needed.

### 5. Console audit (NFR-OBS-01)

Manual checklist in `docs/test-plan.md`:

1. Open devtools console (verbose)
2. Load `/` — no logs/errors
3. Type search, select places — no errors (network failures may warn; document acceptable vs fix)
4. Submit route — no logs from app code
5. Toggle theme — no logs

Grep codebase for `console.` in `app/`, `components/`, `lib/` and remove or guard debug statements before sign-off.

### 6. Requirements status updates

After gate passes, batch-update `docs/requirements.md`:

- NFR-PERF-01, NFR-PERF-02, NFR-OBS-01, NFR-DX-01 → `shipped`
- FR-SHELL-01–03, NFR-A11Y-01, NFR-COST-01, NFR-I18N-01, BC-BRAND-01–02, BC-DEMO-01 → `shipped` when manual evidence recorded in test plan

Do not mark dropped/out-of-scope items.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Lighthouse mobile score below 90 due to Leaflet tiles | Run against results page with map; lazy-load map chunk; document score; fix only if below threshold |
| `npm run check` exceeds 60 s on slow CI | Measure on clean checkout; Next build dominates — acceptable if under 60 s locally per NFR-DX-01 |
| Nominatim rate limits during manual QA | Debounce already 1 s; document as external dependency, not app bug |
| Flaky Lighthouse in GitHub Actions | Manual Lighthouse evidence in test plan; CI runs `check` only |
| Over-scoping fixes | Gate fixes limited to console noise, attribution, and perf regressions — no feature creep |

## Migration Plan

1. Land scripts and workflow (no user-visible change)
2. Add `docs/test-plan.md` and run manual checks
3. Fix discovered issues in small commits
4. Update requirements statuses
5. Archive OpenSpec change; sync main spec `quality-gate`

Rollback: revert workflow/scripts if CI blocks forks; test plan doc is additive.

## Open Questions

- Whether to add `@lhci/cli` in this change or keep Lighthouse manual-only (default: manual unless implementer confirms stable CI scores)
- Exact Lighthouse URL state: empty form vs pre-filled share URL (prefer share URL with sample Kyiv→Lviv route for representative demo)
