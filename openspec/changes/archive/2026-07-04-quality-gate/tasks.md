## 1. Check scripts (NFR-DX-01)

- [x] 1.1 Add `"typecheck": "tsc --noEmit"` to `package.json`
- [x] 1.2 Add `"check": "npm run lint && npm run typecheck && npm test && npm run build"` to `package.json`
- [x] 1.3 Run `npm run check` locally and confirm total time under 60 s on clean checkout

## 2. Continuous integration

- [x] 2.1 Create `.github/workflows/quality.yml` — Node 20, `npm ci`, `npm run check` on `push` to main and all `pull_request`
- [x] 2.2 Verify workflow syntax (local act optional) and document in test plan

## 3. Requirement traceability (BC-DEMO-01)

- [x] 3.1 Create `docs/test-plan.md` with trace matrix covering all MVP `FR-*`, `NFR-*`, and `BC-*` IDs from `docs/requirements.md`
- [x] 3.2 For each row: verification type (automated/manual), evidence path (test file or checklist step)
- [x] 3.3 Add short pointer to `docs/test-plan.md` from project README or `docs/product-brief.md`

## 4. Performance verification

- [x] 4.1 Confirm `lib/route-engine/__tests__/performance.test.ts` passes (NFR-PERF-02)
- [x] 4.2 Run production build (`npm run build && npm start`), execute Lighthouse mobile + desktop on representative demo URL
- [x] 4.3 Record Lighthouse Performance scores in `docs/test-plan.md`; fix bundle/render issues if either score < 90 (NFR-PERF-01)

## 5. Console audit (NFR-OBS-01)

- [x] 5.1 Grep `app/`, `components/`, `lib/` for `console.` — remove debug logging
- [x] 5.2 Execute console-audit checklist from test plan (load, search, submit, theme toggle) in production mode
- [x] 5.3 Document audit result and any acceptable external warnings in `docs/test-plan.md`

## 6. Manual verification pass

- [x] 6.1 Manual: responsive shell at 768 px and 1280 px (FR-SHELL-02)
- [x] 6.2 Manual: keyboard navigation and focus rings on form fields (NFR-A11Y-01)
- [x] 6.3 Manual: Ukrainian copy throughout; footer OSM/routing attribution links (BC-BRAND-01, BC-BRAND-02)
- [x] 6.4 Manual: no analytics scripts or cookies (BC-PRIVACY-01, BC-PRIVACY-02, NFR-COST-01)

## 7. Requirements status and handoff

- [x] 7.1 Update `docs/requirements.md` — mark verified NFRs and remaining FR/BC items as `shipped`
- [x] 7.2 Update `docs/current-state.md` with quality-gate completion summary
- [x] 7.3 Run final `npm run check` before archive

## 8. Verification

- [x] 8.1 All tasks above complete; OpenSpec change ready for `/opsx:archive`
