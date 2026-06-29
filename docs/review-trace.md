# Review trace — maker ≠ checker

The implementation was written by one agent (the "maker") and then reviewed by a
**separate, independent agent** (the "checker") with a clean context and an adversarial
prompt ("try to break it; don't praise it"). This file records what the checker found
and how each item was resolved — the audit trail the course asks for.

> The checker did not write the code; the maker did not grade its own work.

## Findings and resolutions

| # | Sev | Finding | Resolution |
|---|-----|---------|------------|
| 1 | HIGH | Unknown/novel action strings (e.g. `["forget"]`) silently collapsed to `no-op` → score 0. Fail-open for a *risk* tool. | `normalizeAction` now maps unrecognized actions to a new `unknown` action; `ACTION_WEIGHTS.unknown = 40` (fail-safe). New tests in `tests/edge.test.ts`; eval case `unknown-action-fails-safe`. Documented in ADR-0001 and FR-SCORE-01. |
| 2 | HIGH | Eval check `high-risk-never-called-safe` scanned the whole line including the **user-controlled address** — couldn't detect tool misbehaviour and false-failed on a resource literally named `…safe`. | Rubric now scans only the tool-generated **reason** (text after `" — "`), via `reasonOf()`. Renamed to `high-risk-reason-never-reassures`. Eval case `address-contains-safe-word` added to prove no false fail. |
| 3 | MED | Elevated-risk change with no rule hit (e.g. stateless `replace` = medium) was filed under "no policy findings" → header/body/JSON contradiction; medium item invisible. | `summarize` now reports any finding where `risk !== "low"` too (`isActionable`). Eval case `medium-stateless-replace-no-rule`; test in `tests/edge.test.ts`. |
| 4 | MED | Header rubric used substring match (`"0 high"` matches `"10 high"`) and never checked `medium`. | Replaced with exact first-line comparison against a header rebuilt from `json.counts` (`header-counts-match-data-exactly`). |
| 5 | MED | `localeCompare` (no locale) made tie-break ordering locale-dependent → violates NFR-DETERMINISTIC-01. | Replaced with locale-independent code-unit comparison `compareAddress`. |
| 6 | LOW | `requiredTags` fired on `replace`, but FR-TAGS-01 said only "created/updated" (spec/code disagreement). | Updated FR-TAGS-01 to include `replace` (it re-creates the resource), with rationale. |
| 7 | LOW | Medium band (40) used in code but undocumented in ADR-0001. | Documented the medium band and the unknown-action rule in ADR-0001. |
| 8 | LOW | `key in change.tags` walks the prototype chain. Not exploitable (zod yields a plain object) but unclear. | Switched to `Object.hasOwn(change.tags, key)`. |
| 9 | LOW | Eval dataset had only happy-path cases → close to "always passes". | Added 3 adversarial cases (safe-word address, medium stateless replace, unknown action). Eval grew 4 → 7 cases, 20 → 35 checks. |

## Items reviewed and accepted as-is

- CLI positional/flag parsing edge cases (a file named `-x`, unknown flags) — out of
  scope for the homework; documented as a known limitation.
- `json.total` (all changes) vs `json.findings` (actionable only) naming — kept; the
  README and types explain the distinction.

## After the first (agent) review

`npm run verify` → lint ✓ · typecheck ✓ · tests ✓ · eval 35/35 over 7 cases ✓.

## Second pass — independent external audit (against the assignment README)

A third reviewer audited the submission as a whole. Findings and resolutions:

| Sev | Finding | Resolution |
|-----|---------|------------|
| **P1 blocker** | `npm ci` failed on **Linux CI**: `@emnapi/core` / `@napi-rs/runtime` missing from the lockfile (vitest 4 pulled `rolldown` + `@napi-rs/wasm-runtime`, the npm cross-platform optional-deps bug). Passed locally on macOS, contradicting the green-gate claim. | Removed the entire vitest/vite/rolldown/esbuild test stack; migrated all tests to Node's built-in **`node:test`**. Regenerated `package-lock.json`. `npm ci` now installs clean on any platform; `rolldown`/`emnapi`/`vitest` entries: 0. |
| **P2** | Very long Terraform addresses could swallow the reason — the line was truncated blindly at the end, dropping `— delete of stateful resource`. | `summarizeFinding` now truncates the **address in the middle** and always keeps label/score/reason. New test `preserves the reason for a very long address`. |
| **P3** | Stateful heuristic (`type.includes()`) false-positives on lookalikes like `aws_s3_bucket_public_access_block`, `aws_iam_instance_profile`. | Added `STATEFUL_DENYLIST` checked before the patterns; documented in FR-RISK-01. New test `does not false-positive on lookalike stateless types`. |
| **P3** | PR submission metadata (real name, video link, practices) not verifiable from the repo. | By design — the PR is opened after local validation; the filled template carries name + asciinema link + practices. Tracked as the final step. |

After this pass: `npm ci` ✓ · lint ✓ · typecheck ✓ · **28 tests** ✓ · eval 35/35 ✓ · 0 vulnerabilities.
