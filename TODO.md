# TODO — priority backlog

> RULE: Single source of truth for what to do next. Agent reads this before picking work.
> Order = priority. Top item is next. Check `[x]` when done, do not delete — history is evidence.
> Format: `- [ ] **P0** short imperative — why / acceptance.` Priorities: P0 blocker, P1 must, P2 nice.
> Markdown, Obsidian + GitHub compatible. English, terse.

## Now

- [ ] **P0** Spike: dry run on `Day_02` — convert PDFs, run author, count chunks and terms. Sizes MVP by fact, not guess. Also verifies GitBook hides HTML comments.
- [ ] **P1** Write OpenSpec changes for MVP capabilities — intake, author, censor, glossary, cutter, checks, assembler, publish.

## Later

- [ ] **P1** Maintain `docs/prd-final.md` — target picture; do not let it drift from `docs/prd.md`.
- [ ] **P1** Add GitBook content submodule after MVP — pin published book revision; support rollback and later publishing targets.
- [ ] **P2** Define publication-state semantics after MVP — distinguish pushed, synced, and published only if workflow needs it.
- [ ] **P2** Decide source-provenance design after MVP — add evidence mapping only if review shows need.
- [ ] **P1** Bootstrap OpenSpec — initialize official workflow after PRD approval and before implementation.
- [ ] **P1** Initialize Obsidian workflow — use repository as vault; add only justified root-level templates or helper skills.
- [ ] **P1** Pick stack after PRD and record Architecture Decision Record — use one linked Markdown file with numbered decisions; then replace `CLAUDE.md` stack section with real build, lint, and test commands.
- [ ] **P1** Move term-extraction requirements into OpenSpec — define article structure, glossary cards, cross-links, and Ukrainian Wikipedia links.
- [ ] **P1** Add a sample transcript fixture — provide test material after requirements exist.
- [ ] **P1** Ignore working transcripts after `Day-01` sample lands — keep future scratch inputs out of the baseline, not the sample itself.
- [ ] **P2** Mirror the "read AGENTS.md" pointer into other IDE rule files (`.cursor/`, `.windsurf/`, `.clinerules/`, `.opencode/`, `.github/copilot-instructions.md`) — none of them exist yet, `CLAUDE.md` used to claim they did.
- [ ] **P2** Define maker ≠ checker split: which subagent writes, which verifies. Graded criterion.
- [ ] **P2** Record the 1–2 min video demo, link it in the PR.
- [ ] **P2** *(lowest — cosmetic, no data loss)* Investigate spurious `ENOENT: no such file or directory, statx` from `Edit` on `STATUS.md` — writes actually succeed; suspect WSL2 `/mnt/c` 9p/drvfs stat caching. Fix or confirm harmless; do not chase until it costs real time.
- [ ] **P2** Research why the caveman plugin ships `Boundaries: code/commits/PRs written normal` (from its `caveman-init` skill, not from CodeRabbit — `.coderabbit.yaml` says nothing about style). Hypothesis: compressing code would corrupt it, so the plugin fences it off. We already overrode commits and code comments to human-first prose; the **code** exception stays untouched until this is understood. Do not "optimize" it away.

## Done

<!-- move completed items here, newest on top -->

- [x] **P0** Fill `openspec/config.yaml` context — MVP source, constraints, roles, language, dependency, and artifact rules added.
- [x] **P1** Draft and approve PRD — split into `docs/prd.md` (MVP) and `docs/prd-final.md` (target). Chunk = unit of human attention; code over agents; glossary approved before article; partial publish with dimmed unreviewed chunks; first draft stashed locally.

- [x] **P1** Bootstrap OpenSpec — initialized `openspec/` with `core` workflow and Codex/Claude skills; wait for approved PRD before first change.
- [x] **P0** Commit and push clean baseline to `main` — `9c44c25` pushed; `Day-01` sources stayed untracked; stopped before PRD/OpenSpec/implementation.
- [x] **P0** Compress status-log rule — preserve conditions; remove prose overhead.
- [x] **P0** Refine status-log rules — log only material project state; `Did` names Codex or Claude.
- [x] **P0** Add local Claude settings ignore — keep `.claude/settings.local.json` out of repo; defer transcript ignore until `Day-01` sample exists.
- [x] **P1** Enable RTK for all Codex sessions — global `~/.codex/AGENTS.md` imports `RTK.md`; current root session adopted RTK immediately.
- [x] **P0** Fix repository artifact layout — created root-level `templates/` and `verification/`; rules keep templates/reports outside `docs/` and avoid file sprawl.
- [x] **P1** Audit session-start context rule — root reads `TODO.md`, then `STATUS.md`; validates own harness resume row; subagents cannot edit resume rows.
- [x] **P0** Run baseline pre-push checks — clean diff, no secret-pattern hits, valid Markdown targets, LF configs, `main` branch, correct `origin`; source examples remain untracked.
- [x] **P0** Decide agent-tooling tracking — keep `.agents/` and `skills-lock.json` local and ignored; Caveman is development tooling, not product dependency or deliverable.
- [x] **P0** Verify CodeRabbit file limit — official plans define 150 files/review for Free, Trial, OSS; added conservative `≤150` changed-files-per-PR rule, not repository cap.
- [x] **P0** Finish `CLAUDE.md` compression — removed false README rule source; kept `AGENTS.md` sole authority; applied local lossless compression after external skill call was security-blocked.
- [x] **P0** Classify untracked transcript material — `input/transcripts/Day-01/` contains first working source examples; exclude from baseline commit.
- [x] **P0** Reconcile `CLAUDE.md` language with `AGENTS.md` — translated project orientation to terse English; preserved structure and meaning.
- [x] **P0** Align backlog with agreed push phases — cleanup and baseline push precede PRD, OpenSpec, Obsidian, stack, and implementation.
- [x] **P1** Make bilingual README Ukrainian-first — removed stray English tagline before title; mirrored sections remain.
- [x] **P1** Persist root harness resume commands — one Claude row and one Codex row in `STATUS.md`; root owner validates own row at session start.
- [x] **P0** Link course brief from bilingual README — Ukrainian and English sections link `docs/course-assignment.md`.
- [x] **P0** Split course brief from product README — starter assignment preserved verbatim in `docs/course-assignment.md`; bilingual README now product-only.
- [x] **P1** Enforce single-topic discussion — handle one problem or next step; park remaining items in backlog.
