# Project statistics — Transon Visual Editor

> Snapshot date: 2026-07-01 · Commit: `b231d6f` (branch `fix-editor-layout-css`) · All numbers
> measured; source cited per row. No narrative — see
> [harness-effectiveness-review.md](harness-effectiveness-review.md) /
> [roadmap-effectiveness-gap-analysis.md](roadmap-effectiveness-gap-analysis.md) for analysis.

## 1. Product scope

| Metric | Count | Of which done | Source |
|---|---:|---:|---|
| Milestones (M0–M5) | 6 | 6 ☑ | ROADMAP.md milestone tracker |
| FR (functional requirements) | 129 (FR-001…FR-129) | see coverage below | `grep -oE 'FR-[0-9]{3}' docs/SPEC.md \| sort -u` |
| NFR | 48 (…NFR-048) | ″ | same, `NFR-` |
| AC (acceptance criteria) | 40 (…AC-040) | 40 rows tracked | SPEC.md / traceability.md AC table |
| UC (use cases) | 16 | — | SPEC.md |
| AD (architecture decisions) | 33 | 2 superseded (AD-014/016) | ARCHITECTURE.md §3 |
| OQ (open questions) | 17 | 17 ratified | ROADMAP.md §Open questions |
| DoD gate items | 6 per milestone × 6 = 36 | 36 (all milestones ☑) | ROADMAP.md §Definition of Done |
| Traceability status marks | 102 | 67 [x] · 23 [~] · 12 [ ] | `grep -oE '\[x\]\|\[~\]\|\[ \]' docs/traceability.md` |
| Deprecated IDs | 1 | — | SPEC.md §21.1 (append-only) |
| Rules / operator tokens / functions | 22 / 28 / 4 | parity: consistent | `check_engine_parity.py` output |
| Palette block definitions (rule×variant) | 34 | 34 load + instantiate | traceability.md (palette-load test) |
| Round-trip corpus (engine examples) | 147 | 147 green (structural + execution identity) | traceability.md corpus rows |
| Round-trip corpus groups | 12 | 11 [x] · 1 [~] | traceability.md §Round-trip corpus |
| Agentic maturity score | 93% (31.5/34, L4 Optimizing) | — | `check_maturity.py` |

## 2. Development activity

| Metric | Value | Source |
|---|---:|---|
| Commits (current lineage) | 71 | `git rev-list --count HEAD` |
| Commits (all branches, incl. 2 abandoned attempts) | 95 | `git rev-list --all --count` |
| Branches | 16 (main + 6 milestone + 1 fix + 8 `old-1/`/`old-2/`/alt) | `git branch -a` |
| Merge commits / PRs | 0 / 0 (linear history, branches unmerged-but-continued) | `git log --merges` |
| Lines added / deleted (cumulative, HEAD lineage) | +58,841 / −9,235 | `git log --numstat` |
| Net lines | +49,606 | derived |
| Files touched (distinct) | 260 | `git log --name-only \| sort -u` |
| Largest commit | 13,012 lines (`142bbc9`, M2 catalog fold) | `git log --numstat` |
| Commit subject prefixes | editor 36 · docs 20 · harness 6 · tooling 5 · docs+tooling 2 · other 2 | conventional prefixes, HEAD lineage |
| Commits citing a milestone in subject | M0 4 · M1 10 · M2 7 · M3 7 · M4 10 · M5 10 | `git log --format=%s \| grep -c M<n>` |
| `git commit` invocations vs landed commits | 118 vs 95 (23 hook-rejected/amended/retried) | session transcripts vs `git rev-list --all` |

## 3. Codebase

| Metric | Value | Source |
|---|---:|---|
| Packages | 4 publishable + 1 internal (`editor-ui`) + 1 demo host | pnpm-workspace.yaml |
| Hand-written source LOC (TS, non-test, non-generated) | 4,506 (46 files) | `find packages -name '*.ts*'` excl. test/dist/artifacts |
| Hand-authored projection templates (`G_*`, Transon JSON) | 1,533 (4 files) | `wc -l packages/editor-core/src/codec/generators/*` |
| Generated codec artifacts (JSON, committed) | 15,610 (5 files) | `wc -l packages/editor-core/src/codec/artifacts/*` |
| Test LOC | 6,013 (71 `*.test.ts(x)` files, 80 files under test paths) | `find … -path '*test*'` |
| Test:hand-written-source ratio | 1.0 : 1 (6,013 : 6,039) | derived (source = TS + `G_*`) |
| Test cases | 1,564 passed, 0 failed (11 vitest projects) | `pnpm turbo run test --force` |
| Contract docs LOC | 4,776 (`docs/*.md` + guides) | `wc -l` |
| Harness LOC (gates, evals, hooks, roles) | 3,028 | `wc -l` over `harness/` |
| Deterministic gate scripts | 7 `check_*.py` + `run_evals.py` + `update_memory.py` | `ls harness/scripts/` |
| Eval cases | 3 | `ls harness/evals/cases/` |
| Generated:hand-written code ratio | 2.6 : 1 (15,610 : 6,039) | derived |

## 4. Effort estimate (counterfactual, no AI)

| Basis | Estimate | Method |
|---|---:|---|
| COCOMO-81 organic on 12.1 hand-written KLOC (src+`G_*`+tests) | ≈ 33 person-months | 2.4 × KLOC^1.05 |
| Bottom-up: 129 FR-equivalents × 0.75 person-day (impl+test) | ≈ 97 person-days | senior TS dev, test-first |
| Bottom-up: spec/architecture authoring (4.8K doc lines, 33 AD, 17 OQ) | ≈ 30 person-days | 2 pages/day incl. review |
| Bottom-up: harness, gates, CI, corpus infrastructure | ≈ 12 person-days | 3K LOC scripts + CI |
| Bottom-up: projection-codec design risk (novel, self-hosted) | ≈ 15 person-days | de-risk prototype allowance |
| **Bottom-up total** | **≈ 154 person-days ≈ 7.3 person-months** | sum |
| **Range (low – high)** | **7 – 33 person-months (147 – 693 person-days)** | bottom-up vs COCOMO |
| Actual AI-assisted span | 9 calendar days (§6) | git history |
| Compression ratio | ≈ 16× – 77× (calendar-day basis) | estimate ÷ actual |
| AI spend per bottom-up person-day displaced | ≈ $6.3 | $968 (§5) ÷ 154 pd |

## 5. AI / harness usage

> Coverage: Claude Code transcripts + ccusage, sessions of 2026-06-28 → 2026-07-01 (M1–M5 + retro).
> The docs-baseline phase (Jun 23–27) and engine-repo M0 work ran outside these transcripts and are
> not counted here.

| Metric | Value | Source |
|---|---:|---|
| Tokens — input / output | 0.90 M / 5.17 M | ccusage session, 29 project sessions |
| Tokens — cache write / cache read | 28.8 M / 1,161.8 M | ccusage |
| Total cost | $967.58 | ccusage |
| Cost by model | Opus 4.8 $929.94 · Sonnet 4.6 $26.55 · Fable 5 $10.67 · Haiku 4.5 $0.42 | ccusage modelBreakdowns |
| Sessions / assistant messages / user text turns | 30 / 9,779 / 321 | project transcripts (`*.jsonl`) |
| Tool calls (total) | 4,544 | transcripts, `tool_use` count |
| Top tools | Bash 1,647 · Edit 1,121 · Read 760 · Write 357 · TaskUpdate 181 · TaskCreate 132 · Agent 57 · AskUserQuestion 38 | transcripts |
| Browser-automation tool calls (Playwright MCP) | ≈ 120 | transcripts, `mcp__playwright__*` |
| Subagent runs (by role) | milestone-planner 17 · round-trip-reviewer 14 · requirement-implementer 12 · general-purpose 11 · Explore 2 · claude-code-guide 1 (Σ 57) | transcripts, Agent-tool inputs |
| Human decision points (AskUserQuestion) | 38 | transcripts |
| Test-suite invocations | 365 | transcripts, Bash commands matching turbo/vitest |
| Gate-script invocations (`check_*.py`) | 241 | transcripts |
| Eval runs (`run_evals.py`) | 47 | transcripts |
| Memory/handoff refreshes (`update_memory.py`) | 95 | transcripts |
| Harness inventory | 3 agents · 2 commands · 4 skills · 6 rules · 4 session hooks · 2 git hooks · 1 workflow · 9 scripts · 3 evals · 2 CI jobs · 2 MCP servers | `.claude/`, `.cursor/`, `harness/`, `.github/` |
| Adapter parity (Cursor ↔ Claude Code) | 100% (gated) | `run_evals.py` parity check |

## 6. Timeline

| Metric | Value | Source |
|---|---:|---|
| First → last commit | 2026-06-23 → 2026-07-01 (9 calendar days) | `git log --reverse` |
| Active days (≥1 commit) | 9 of 9 | `git log --date=short` |
| Commits per day | 2 · 1 · 2 · 1 · 1 · 2 · 11 · 30 · 21 | `git log --date=short \| uniq -c` |
| Docs-baseline phase → implementation burst | Jun 23–28 (9 commits) → Jun 29–Jul 1 (62 commits) | commit subjects/dates |
| Docs v2.0 baseline → first codec commit lead time | 2 days (SPEC v2.0 2026-06-27 → M1 2026-06-29) | doc headers + git |
| Milestone completion dates (M0…M5) | ≤06-29 · 06-29 · 06-30 · 06-30 · 07-01 · 07-01 | milestone-citing commits |
| Abandoned attempt paths before final | 2 (`old-1/*` 4 branches, `old-2/*` 3 branches) | `git branch -a` |
| Longest idle gap | 0 days | commit dates |
