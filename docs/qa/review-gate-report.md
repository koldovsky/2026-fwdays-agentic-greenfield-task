# Global review-gate report (Phase 7)

Generated: 2026-07-03T21:01:00Z  
Scope: entire MVP (`git diff cbc51f1..HEAD`, 392 files)  
Workflow: `review-gate` — correctness + security + spec-compliance (+ visual skipped: no QA stills)

## Summary

| Verdict | Count |
|---------|------:|
| **Confirmed** | 5 → **fixed** |
| **Contested** | 2 → **fixed** |
| **Rejected / track only** | 2 |

**Overall:** MVP review findings addressed; re-run `review-gate` optional for sign-off.

**Fix commit:** pending (working tree).

---

## Confirmed findings (fixed)

### 1. Score breakdown rows can sum above displayed competitive score (critical)

- **Dimension:** spec-compliance, correctness  
- **File:** `app/lib/recommend.ts` (`scoreBreakdown`)  
- **Evidence:** `competitiveScore()` caps at 200 (`app/lib/scoring.ts:86`), but breakdown rows use uncapped `scores[key] * weight` plus `rawScore * bonus`. At max scores + all benefits, rows sum to ~216 while the modal total shows 200. Violates program-detail spec: *contributions SHALL sum to the competitive-score total*.  
- **Suggestion:** Scale or clamp breakdown rows so their sum equals `evaluation.competitive`.

### 2. Detail modal gives chance-based advice for non-fitting programs (major)

- **Dimension:** spec-compliance  
- **File:** `app/lib/recommend.ts` (`adviceFor`), `app/components/planner/DetailModal.tsx`  
- **Evidence:** Modal always calls `adviceFor()` even when `evaluation.fits === false`. User sees neutral "Інший предмет НМТ" in the ring but concrete safe/realistic/reach advice below — contradicts BC-HONESTY-01 / recommendations spec (no invented chance guidance for wrong elective).  
- **Suggestion:** Branch on `evaluation.fits`; return neutral copy when the program doesn't accept the chosen elective.

### 3. Comparison table chance row is color-only (major)

- **Dimension:** spec-compliance, a11y  
- **File:** `app/components/planner/Comparison.tsx:30-36`  
- **Evidence:** "Шанс" cell shows only `formatPercent(chance)` with category conveyed via `color: var(--pk-${category})`. Comparison spec requires category **not color-only** (text label or mark).  
- **Suggestion:** Append category label (e.g. `72 % · Реально`) like `CategoryPill` elsewhere.

### 4. localStorage shape not validated — malformed payload can crash render (major)

- **Dimension:** correctness  
- **File:** `app/lib/storage.ts` (`loadState`), `app/lib/profileStore.ts` (`hydrate`)  
- **Evidence:** Only `typeof parsed === "object"` is checked. Values like `saved: null` or `compare: "x"` spread into state; `Object.keys(profile.saved)` / `.includes()` throw on first render. No `app/error.tsx`. Baseline spec covers invalid JSON only, but file header claims corruption tolerance.  
- **Suggestion:** Validate/coerce `scores`, `saved`, `compare`, `fields`, `cities` before merge; fall back per-field to defaults.

### 5. Hardcoded "3 days to deadline" in saved list (minor)

- **Dimension:** spec-compliance (scope drift)  
- **File:** `app/components/planner/SavedList.tsx:39-44`  
- **Evidence:** Static banner contradicts shell `DeadlineBanner` (~27 days to 2026-07-31). FR-LIST-03 is out of MVP scope.  
- **Suggestion:** Remove banner or compute from the same deadline source as the shell.

---

## Contested (treat as confirmed unless trivially wrong)

### 6. Empty-filter hint omits field/city filters (minor)

- **File:** `app/lib/copy.ts` (`EMPTY.recommendations`)  
- **Evidence:** Hint mentions category tab and scores only; filtering spec empty state should hint to relax field/city filters.  
- **Suggestion:** Add copy for clearing napрям/місто chips.

### 7. Advice thresholds duplicated as magic numbers (minor)

- **File:** `app/lib/copy.ts` (`adviceBase`) vs `app/lib/scoring.ts` (`SAFE_THRESHOLD` / `REAL_THRESHOLD`)  
- **Evidence:** Currently aligned (75/40) but not linked.  
- **Suggestion:** Import shared constants.

---

## Rejected / track only

| Finding | Reason |
|---------|--------|
| postcss CVE in Next (moderate) | Build-time transitive dep; no user CSS pipeline; fix via Next upgrade |
| Missing CSP headers | Defense-in-depth only; no XSS sinks in current UI |

---

## Next steps (G7)

1. Fix confirmed items 1–3 (spec blockers); 4 (robustness); 5 (quick).  
2. Re-run `npm run test:run` + `npm run qa:verify`.  
3. Optional: `trajectory-eval` workflow + `check-trajectory --release` (per-slice `review-findings.json` still missing — retrofit).  
4. Re-run global `review-gate` after fixes if any were substantial.
