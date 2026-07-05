# Peer submissions analysis — fwdays "Agentic Engineering: Greenfield"

> Analysis of the 27 open submission PRs in
> [koldovsky/2026-fwdays-agentic-greenfield-task](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task),
> graded against the course plot ([day 1](https://koldovsky.github.io/2026-fwdays-agentic-greenfield-slidev/#/day01) ·
> [day 2](https://koldovsky.github.io/2026-fwdays-agentic-greenfield-slidev/#/day02) ·
> [day 3](https://koldovsky.github.io/2026-fwdays-agentic-greenfield-slidev/#/day03)) and the task
> repo's own grading rules ("докази процесу, а не стек"). Compiled 2026-07-05 by a multi-agent
> review pass (9 parallel graders, one calibration pass). Scope of the projects was deliberately
> ignored — only the evidence of the agentic engineering process was graded.

## Method

Evidence harvested per PR: PR description, fork/external-repo file trees and key artifacts,
commit history, and CodeRabbit review threads. Every score must cite a committed artifact;
a claim without repo evidence caps that category at 1. Closed PRs #1–#3 excluded
(instructor smoke test and superseded resubmissions).

**Categories** (weight): **C1** Context engineering (15%) · **C2** Spec-driven development (15%) ·
**C3** Loop engineering & automation (15%) · **C4** Verification (20%) · **C5** Maker ≠ checker (15%) ·
**C6** Process evidence & memory (10%) · **C7** Unique idea / teachability (10%).

**Scale** 0–4: 0 absent · 1 claimed in PR text only · 2 artifact exists but thin/unused ·
3 systematically applied, visible in history · 4 exemplary — enforced/automated. Bands: A ≥ 3.2,
B ≥ 2.4, C below.

**Gates** (pass/fail, from the repo README, separate from scores): real name · 1–2 min video ·
substantive practices description · carried to completion. Everyone passes except **#19**
(no video — "буде пізніше") and **#13** (thin practices description).

**Calibration adjustments** (cross-grader consistency): **#16** C5 4→3 — reviewer catches are
journal-logged self-reports and the external review round never landed, whereas #14 has raw
per-slice review outputs plus CodeRabbit iteration; **#20** C5 1→2 — an unaddressed CodeRabbit
review is the same situation that earned #29 a 2 (artifact exists, unused).

**Conflict of interest**: PR #21 is the analysis author's own submission. It was graded by an
independent agent pass with the identical rubric, is marked *self*, and is excluded from the
ranking.

### How to read "Steal this" and "Improve"

Every card ends with these two fields. They are the answer to the task's questions *"what good
can we learn from it?"* and *"is there a unique idea?"* — and they follow strict rules so they
stay useful rather than decorative:

- **Steal this** is the submission's most **transferable artifact** — a concrete file, hook,
  gate, or convention you could copy into your own repo tomorrow. It is deliberately an
  *artifact*, not a virtue: "wrote good tests" is not stealable; a committed mutation-check log
  is. Each entry is structured as **what it is → why it works → how to adopt it**. The field
  feeds C7 but is chosen across all categories, and it is allowed to be "none" — an honest
  rubric needs a zero point. Notably, several of the best steals come from *mid-table*
  submissions (#20's live-run gate, #13's retrofit labeling, #30's MCP semaphores): a weak
  overall process can still contain one excellent, original mechanism, and the field exists
  precisely so those ideas aren't lost behind a mediocre composite score.

- **Improve** is the **single highest-leverage gap**: the one change that would most raise both
  the score and — per the course's own framing — the *trustworthiness* of the process. It is not
  a list of everything wrong; it is what to do next. Each entry is structured as **gap → why it
  matters → concrete next step**. Across the cohort the improvements cluster into four recurring
  themes, which are themselves a lesson:
  1. **Preserve real git history** — squashed or batch-recommitted history destroys exactly the
     trajectory evidence the course grades (7+ submissions).
  2. **Close the external-review loop** — a review that produced findings nobody answered is an
     open circuit, not a checker (#29, #20, #19, #15, #18).
  3. **Turn claims into committed artifacts** — anything kept local, gitignored, or "described in
     the PR text" grades as a claim (#30, #24, #14's gitignored driver).
  4. **Make gates enforcement, not convention** — a documented rule the agent *can* skip will
     eventually be skipped; hooks and CI are the fix (#5, #17, #4).

## Leaderboard

| Rank | PR | Author — project | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Overall | Band |
|------|----|------------------|----|----|----|----|----|----|----|---------|------|
| 1 | [#14](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/14) | Mashkin — Finup finance PWA | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.00** | A |
| 2= | [#7](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/7) | Khorsun — Kolo360 HR platform | 4 | 4 | 4 | 4 | 3 | 4 | 4 | **3.85** | A |
| 2= | [#12](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/12) | Nesterenko — Гривня NBU rates | 4 | 4 | 3 | 4 | 4 | 4 | 4 | **3.85** | A |
| 2= | [#25](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/25) | Sydoruk — MetalReleaseTracker | 4 | 4 | 3 | 4 | 4 | 4 | 4 | **3.85** | A |
| 2= | [#16](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/16) | Volchkov — Nutrition coach bot | 4 | 4 | 4 | 4 | 3 | 4 | 4 | **3.85** | A |
| 6= | [#6](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/6) | Mushtruk — Надворі weather | 4 | 4 | 4 | 4 | 3 | 3 | 4 | **3.75** | A |
| 6= | [#10](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/10) | Bolotov — Поливайко plants | 3 | 4 | 4 | 4 | 4 | 4 | 3 | **3.75** | A |
| 8 | [#22](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/22) | Tarasenko — Go prompt CLI | 4 | 4 | 4 | 4 | 3 | 3 | 3 | **3.65** | A |
| 9= | [#5](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/5) | Fryntsko — Break-reminder PWA | 4 | 3 | 3 | 4 | 4 | 4 | 3 | **3.60** | A |
| 9= | [#17](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/17) | Dorontsev — Local RAG CLI | 3 | 4 | 3 | 4 | 4 | 3 | 4 | **3.60** | A |
| 11 | [#9](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/9) | Khodakivskyi — tf-guard linter | 3 | 3 | 3 | 4 | 4 | 4 | 4 | **3.55** | A |
| 12 | [#26](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/26) | Перерва — Prokhidnyi admissions | 4 | 4 | 3 | 3 | 3 | 4 | 3 | **3.40** | A |
| 13 | [#23](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/23) | Yehorushkin — Honeydo iOS tracker | 4 | 3 | 3 | 3 | 3 | 4 | 4 | **3.35** | A |
| 14 | [#11](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/11) | Онуфрійчук — Chord Dice (Flutter) | 4 | 2 | 4 | 3 | 3 | 3 | 4 | **3.25** | A |
| 15 | [#29](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/29) | Мацецка — Jira→Markdown extension | 4 | 3 | 3 | 3 | 2 | 4 | 3 | **3.10** | B |
| 16 | [#24](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/24) | Kalyna — Weigh-in Telegram bot | 3 | 4 | 3 | 3 | 3 | 2 | 3 | **3.05** | B |
| 17= | [#8](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/8) | Tovstonoh — Bookshelf notes | 3 | 3 | 3 | 3 | 2 | 3 | 3 | **2.85** | B |
| 17= | [#15](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/15) | Rohov — Siebel AI reviewer | 3 | 3 | 3 | 3 | 2 | 3 | 3 | **2.85** | B |
| 19 | [#27](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/27) | Bugaiov — Colibri Book HOA | 3 | 3 | 3 | 3 | 2 | 2 | 3 | **2.75** | B |
| 20 | [#28](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/28) | Чайка — MotoRoute planner | 3 | 4 | 2 | 3 | 1 | 3 | 3 | **2.70** | B |
| 21 | [#20](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/20) | Дмитрук — Monobank jar CLI | 2 | 3 | 2 | 3 | 2 | 3 | 3 | **2.55** | B |
| 22 | [#4](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/4) | Fomin — Pokédex Explorer | 3 | 3 | 3 | 2 | 1 | 3 | 3 | **2.50** | B |
| 23 | [#13](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/13) | Onufriienko — ForgeFlow inventory | 2 | 3 | 2 | 3 | 2 | 3 | 2 | **2.45** | B |
| 24 | [#19](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/19) | Пікуля — Conversion-sync SaaS | 3 | 3 | 2 | 2 | 2 | 3 | 2 | **2.40** | B ⚠️ no video |
| 25 | [#30](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/30) | Березовський — Vue resume site | 1 | 1 | 2 | 4 | 3 | 2 | 3 | **2.35** | C |
| 26 | [#18](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/18) | Гринчишин — YouTube transcription | 2 | 2 | 1 | 2 | 2 | 2 | 1 | **1.75** | C |
| — | [#21](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task/pull/21) | **Chernyshov — Transon editor (self, unranked)** | 4 | 4 | 3 | 4 | 4 | 4 | 4 | **3.85** | A |

Cohort mean ≈ 3.18, median 3.30 — a strong class. Verification (C4) was the strongest category
cohort-wide; maker ≠ checker (C5) the weakest.

## Per-submission cards (rank order)

### 🥇 #14 — Andriy Mashkin — Finup AI finance PWA — 4.00

The only submission where *honesty itself is machine-checked*: `check-claims.mjs` rejects
"complete/all done" language unless matching evidence artifacts exist, and
`check-red-green-evidence.mjs` demands durable `evidence/red-run.json`/`green-run.json` per slice
(git head + failing tests) — test-first is *proven*, not claimed. Full loop repeated 10× as
per-slice PRs on the fork with CodeRabbit iteration on each; four fresh reviewer roles per slice
with raw outputs committed; findings folded back with regression tests; documented waivers.

- **Steal this**: the claims-lint gate + durable red-run evidence. *What*: `check-claims.mjs`
  scans docs and reports for completion language ("complete", "all done", "100%") and fails
  unless a matching evidence artifact exists; each slice commits a `red-run.json` (git head +
  the list of then-failing tests) and a paired `green-run.json`. *Why it works*: it attacks the
  central failure mode of agentic development — confident claims without proof — at the level
  where agents actually cheat: language. An LLM can always *say* test-first happened; it cannot
  retroactively fabricate a committed red-run snapshot tied to a git head. *How to adopt*: hook
  the claims-lint into pre-commit and CI; have your loop write the red-run JSON automatically on
  the first (expected-failing) test execution of each slice, before implementation starts.
- **Improve**: the 13/13 gate driver `run-all-checks.sh` is gitignored, so the submission's
  headline verification claim is the one thing a stranger cannot reproduce. That is an ironic
  gap in an otherwise evidence-obsessed harness. Commit the script and add a CI job that runs it,
  so "13/13 green" becomes a checkable fact rather than the last remaining claim.

### #7 — Andrii Khorsun — Kolo360 HR platform — 3.85

End-to-end traceability (51 FRs, `@trace` annotations, script-gated in CI), live prompt-injection
eval tests, and `retrofit.json` — machine-readable honesty about which slices *lack* earned
test-first evidence. Multi-model split (Haiku judge / Sonnet interviewer / Opus summarizer).

- **Steal this**: `retrofit.json`. *What*: a machine-readable manifest
  (`.project-factory/retrofit.json`) marking which slices were built before the harness existed
  and therefore have reconstructed rather than earned red-first evidence. *Why it works*: every
  real project has a messy start; the usual move is to backfill evidence and pretend it was
  always there, which poisons trust in *all* the evidence. Declaring the boundary makes the
  earned evidence credible. *How to adopt*: whenever you retrofit process onto existing code,
  record the cutoff in a data file your traceability gate reads, so tooling can treat earned and
  reconstructed slices differently. Honourable mention: the live prompt-injection eval
  (`lib/ai/interview/injection.eval.test.ts`) — adversarial inputs as a first-class eval suite.
- **Improve**: prune the installed-but-dormant factory layers — automations disabled, zero
  recordings, template CI secrets still in place. Dead harness config is context noise for the
  agent and reads as cargo cult to a reviewer; either switch each layer on and let it produce
  artifacts, or delete it so the repo only claims what it does.

### #12 — Yevhen Nesterenko — Гривня NBU rates — 3.85

Hand-authored harness rather than template: maker/reviewer/judge agent trio, G0–G7 checklist
enforced by pre-commit hooks, hand-written traceability gate, and a *cold-start global review*
(fresh context, distrust the maker) that caught a real cross-slice precision bug. ADR-0003
explicitly documents what was reused vs authored.

- **Steal this**: two artifacts. (1) *ADR-0003 "reuse mechanisms, author judgment"* — an ADR that
  itemizes exactly what a framework/template provided vs what the author engineered. Why it
  works: in a course (or hiring) context, the graded thing is *your* engineering; declaring the
  boundary converts "did they just install a template?" from suspicion into a checkable fact.
  (2) *The cold-start global review* — after all slices shipped, a fresh agent session with no
  maker context re-derived expectations from the specs alone and audited the whole system,
  catching a cross-slice rate-precision defect (fix `c7766d7`) that eight per-slice reviews had
  missed. How to adopt: schedule one context-free, spec-only review pass at milestone end;
  its whole value is that it shares no assumptions with the maker.
- **Improve**: red→green ordering is invisible because each slice lands as a single commit.
  The harness already enforces test-first by convention; make it *provable* by splitting each
  slice into a failing-tests commit followed by the implementation commit (or by adopting #14's
  red-run evidence files).

### #25 — Misha Sydoruk — MetalReleaseTracker (.NET rewrite) — 3.85

Deepest review artifacts of the cohort: per-slice `review-findings.json` with
confirmed/contested/rejected verdicts and reproduced bugs; the course rubric encoded into
`.coderabbit.yaml` path instructions; live production cutover driven as a gated,
commit-marker pipeline; vendored skills kept pristine with an explicit override layer.

- **Steal this**: two mechanisms. (1) *Pristine-vendor skill management* — third-party skills are
  vendored unmodified, and every project-specific deviation lives in a separate override layer
  with declared precedence. Why it works: you can diff and upgrade the vendored layer forever,
  and a reader can see at a glance which behavior is yours. Adopt by never editing vendored
  agent assets in place — add an override file the loader applies last. (2) *Rubric-in-CodeRabbit* —
  the course's own grading criteria encoded as `.coderabbit.yaml` path instructions, so the
  external reviewer grades against the actual contract instead of generic lint taste. Adopt by
  translating whatever your project's Definition of Done is into path-scoped review
  instructions.
- **Improve**: the `review-gate.js` adversarial workflow was avoided (an args bug and a ~2M-token
  cost estimate are candidly documented). That avoided gate is precisely the maker≠checker
  backbone the rest of the harness assumes. Fix or slim the tool (scope it per-slice rather than
  whole-repo) instead of routing around it — an unaffordable gate is a design bug in the gate.

### #16 — Ihor Volchkov — Nutrition coach Telegram bot — 3.85 *(calibrated from 4.00)*

Fully autonomous gate-driven loop — 75-commit feat→archive rhythm, six per-phase `ship-*` agents
with model tiering (Opus reasons, Haiku executes), key-less eval ratchet, exceptional honesty
(known failures logged, not hidden). Docked only because reviewer catches are journal-reported
and the external review round never landed.

- **Steal this**: the SKILL/PROFILE split plus model tiering. *What*: `/ship-change` is defined
  as a generic `SKILL.md` (the procedure: phases, gates, escalation rules) plus a repo-specific
  `PROFILE.md` (the bindings: commands, paths, conventions); ADR-0018 assigns each phase a model
  tier — expensive reasoning models plan and review, cheap fast models do mechanical execution.
  *Why it works*: the loop becomes portable (new repo = rewrite one file) and the token bill
  drops without losing judgment where it matters. *How to adopt*: split any custom command you
  own into procedure vs bindings, and annotate each phase with the weakest model that can do it.
- **Improve**: the external review round never landed — 391 files blew past CodeRabbit's cap,
  and the author's re-request produced no findings round. Since the in-house reviewer's catches
  are journal-reported (self-attested), external corroboration is the missing piece: submit
  per-slice PRs sized under the cap so an independent checker actually runs.

### #6 — Dmytro Mushtruk — Надворі weather planner — 3.75

The most enforcement-grade verification: a Stop hook running tsc/eslint/vitest whose exit-code-2
*blocks the agent from ending its turn* until green. Bugfixes flow through the same spec loop as
features. Exemplary append-only session log.

- **Steal this**: the blocking Stop hook. *What*: `.claude/settings.json` wires a Stop event to
  `.claude/hooks/quality-check.ps1`, which runs typecheck/lint/format/tests; exit code 2 blocks
  the agent from ending its turn and feeds the failure output straight back into its context.
  *Why it works*: it converts "the agent should verify before stopping" from a rule the agent
  can forget into a physical property of the harness — the turn *cannot* end red, and the error
  text arrives exactly when the agent needs it. *How to adopt*: wire your full check suite to
  the Stop hook with exit-2 semantics; keep it fast (seconds, not minutes) or the loop stalls.
- **Improve**: the git history was recreated — all commits fall in a 7-minute window on 06-28,
  while the OpenSpec archive dates prove multi-day work. The process was real; the evidence was
  destroyed at submission time. Push the actual working history next time (and make the
  PowerShell-only hook cross-platform so the gate travels with the repo).

### #10 — Nikita Bolotov — Поливайко plant care — 3.75

Project Factory driven end-to-end and *actually exercised*: 436 tests, ratchets, per-slice review
triage with rejected-findings records, and two novel judges — trajectory-eval (grades the
spec→red→green→review *path* from git trailers) and a vision-judge over committed demo recordings.

- **Steal this**: trajectory-eval. *What*: `.claude/workflows/trajectory-eval.js` — an LLM judge
  that reads git commit trailers and grades whether the *path* was right: spec proposed before
  code, tests red before green, review before archive (28/28 checks passing here). *Why it
  works*: output evals tell you the code is good; trajectory evals tell you the *process* was
  followed — which is the course's actual subject, and the thing agents most readily skip when
  unobserved. *How to adopt*: emit machine-readable trailers from your loop (slice ID, phase),
  then judge the ordering; pair with a vision-judge over committed demo recordings for the
  UI claims DOM asserts can't see.
- **Improve**: finish adapting the framework's `AGENTS.md` — "TBD (set at Phase 1)" placeholders
  and rules for features the project doesn't have (auth) are still in the agent's static
  context. Unfilled template text costs tokens, dilutes the rules that matter, and signals the
  context layer was installed rather than engineered; trim it to what this project actually is.

### #22 — Dmytro Tarasenko — Go prompt-segment CLI — 3.65

Stop-hook quality gate (vet/lint/`go test -race`) plus an incident→spec pipeline: dogfooding bugs
became OpenSpec changes with recorded rationale and regression tests. Spec scenarios map ~1:1 to
tests.

- **Steal this**: the incident→spec pipeline. *What*: when dogfooding surfaced two real bugs,
  they did not get hot-fixed — each became an OpenSpec change whose `design.md` documents the
  incident, the considered alternatives, and the risks, plus a regression test
  (`interactive-config-warnings/design.md` is the example). *Why it works*: it keeps the spec
  layer authoritative under pressure — the exact moment most SDD projects silently fork away
  from their specs — and leaves a root-cause record the agent can read later. *How to adopt*:
  make "no fix without a change-pack" a rule, and template the incident fields (symptom, root
  cause, alternatives, regression test) into your change proposal format.
- **Improve**: 13 coarse commits hide red→green ordering, and the CodeRabbit story ended badly —
  rate-limited, then `.coderabbit.yaml` was deleted rather than retried. Commit finer-grained
  (tests, then fix) and restore the external reviewer config so an independent round can land.

### #5 — Serhii Fryntsko — Break-reminder PWA — 3.60

The only submission that *verified its tests*: a separate-session checker disabled a code branch
to prove the acceptance test turns red, logged in the handoff doc, plus a brutally honest
DEV-01..05 gap ledger. `docs/agentic-engineering.md` maps every claimed practice to its evidence
artifact.

- **Steal this**: the mutation-gate check. *What*: a checker running in a separate session
  deliberately broke the code ("disabled snap-to-workStart branch → AC-REMIND-05 went red;
  reverted → green") and logged the result in `docs/current-state.md`. *Why it works*: green
  tests only prove the tests pass, not that they *test* anything — a critical distinction when
  an agent wrote both the code and the tests and is incentivized to make itself pass. A mutation
  probe is the cheapest possible falsification of the test suite itself. *How to adopt*: after
  each slice, have a fresh-context checker pick one core behavior, break it, confirm the
  matching acceptance test fails, revert, and log the round-trip. Honourable mention:
  `docs/agentic-engineering.md`, a practice→evidence index that makes the whole submission
  auditable in one file.
- **Improve**: the commit history was batch-created in a 3-minute window, so the honest process
  narrative has no matching git evidence — the one weak layer in an otherwise evidence-first
  submission. Preserve the real cadence; the DEV-01..05 ledger deserves a history that
  corroborates it.

### #17 — Maksym Dorontsev — Local RAG docs CLI — 3.60

Best external-review iteration in the cohort: 3 CodeRabbit rounds, 6 fix commits, principled
pushback — and every leaked finding converted into a new automated gate. The eval design is the
gem: a fictional "ГущоЛіт" corpus the model can't know, so any non-corpus answer is *provably* a
hallucination, gated on hit/refusal rates.

- **Steal this**: the fictional-domain eval corpus. *What*: the RAG system is tested against a
  wholly invented domain ("ГущоЛіт") with a 28-question golden set, gated on hit-rate and
  refusal-rate ≥ 0.8. *Why it works*: with any real-world corpus you can never tell whether the
  model answered from retrieval or from priors; with a fictional one, every fact not in the
  corpus is a *provable* hallucination and every correct answer is *provably* retrieval. It
  turns the fuzziest LLM property into a deterministic, CI-gateable metric. *How to adopt*:
  synthesize a small internally-consistent fake domain for your retrieval evals; keep the golden
  set versioned next to the corpus. Also worth copying: the habit of converting every review
  finding that "leaked through" into a new automated gate (CI, pre-push, markdownlint) so the
  same class of defect can't recur.
- **Improve**: the pre-push maker≠checker pass exists only as convention — commit a reviewer
  agent definition (role, checklist, output format) so the review pass is a repo artifact the
  harness can enforce, not a habit that survives only as long as the author's discipline.

### #9 — Dmytro Khodakivskyi — tf-guard Terraform linter — 3.55

Proof that small scope + full loop beats big scope: 28 deterministic tests, a key-less eval rubric
with baseline ratchet (CI-gradeable text quality without an LLM judge), and the cleanest
maker≠checker audit trail — `docs/review-trace.md` with 9 adversarial findings (2 HIGH, incl. a
fail-open bug) each mapped to fix+test.

- **Steal this**: the key-less deterministic eval rubric. *What*: `evals/rubric.ts` — 7 cases /
  35 checks scoring the linter's prose explanations with deterministic string/structure rules
  (scoped to the tool-generated reason field, deliberately not user-controlled input), plus a
  committed baseline the score may never drop below. *Why it works*: it gets eval-grade quality
  gating on natural-language output with zero API keys, zero flakiness, and zero cost — CI can
  run it on every push, which an LLM-judge eval rarely affords. *How to adopt*: for any text
  your tool emits, enumerate the properties a good answer must have (mentions the resource,
  names the risk, no hedging), encode them as deterministic checks, and ratchet the baseline.
  Also exemplary: `docs/review-trace.md`, where each of 9 adversarial findings maps to its fix
  commit and regression test — including a HIGH fail-open bug on unknown actions.
- **Improve**: the harness references `.agents/reviewer.md`, which doesn't exist — the one
  dangling edge in a tight evidence chain. Commit it, and unsquash the history so the red→green
  ordering and the two audit rounds are visible in git rather than only in the trace doc.

### #26 — Євгеній Перерва — Prokhidnyi admissions helper — 3.40

LLM-judged output evals over user-facing *microcopy* (honesty/a11y/locale dimensions) with a
ratcheted baseline; hooks enforce spec→commit linkage; retrofitted trajectory evidence honestly
disclosed.

- **Steal this**: output evals on UI copy. *What*: 21 eval cases judging the application's
  user-facing text on honesty (does the UI overpromise?), accessibility phrasing, and locale
  correctness, with a ratcheted baseline in CI. *Why it works*: everyone tests logic; almost
  no one tests the *words* — yet for an advice-giving product (university admissions), a
  misleading sentence is a worse defect than an off-by-one. Judging copy against explicit
  rubric dimensions catches the failure class unit tests structurally cannot. *How to adopt*:
  extract user-visible strings into eval cases, write a 3–4 dimension rubric, ratchet the score.
- **Improve**: trajectory evidence is self-admittedly retrofitted — the test suite landed in one
  commit after all the feature commits. The disclosure is to its credit; the fix is to earn the
  evidence live next time (tests committed red inside each slice), and to re-request the skipped
  CodeRabbit round with a path-scoped config so an external checker corroborates the self-review.

### #23 — Bohdan Yehorushkin — Honeydo iOS tracker — 3.35

A full design system packaged *as an agent skill* (tokens, component JSX + prompt files,
"reproduce, don't approximate" rule); best session-continuity journal; FR IDs in ~all 72 commits;
fixed a GitGuardian secret leak within 25 minutes.

- **Steal this**: design-system-as-skill. *What*: the `honeydo-design` skill bundles design
  tokens, reference component implementations (JSX), and per-component prompt files, with an
  AGENTS.md rule that the agent must *reproduce* the reference, not approximate it. *Why it
  works*: visual drift is the classic agentic failure — every regeneration is slightly
  different. Making the design system a skill puts the ground truth inside the agent's
  operating context and makes deviation a rule violation rather than a taste dispute. *How to
  adopt*: export tokens + one reference implementation per component into a skill directory;
  add the reproduce-don't-approximate rule; reference it from your rules file.
- **Improve**: two lifecycle gaps — no CI workflow in the repo, and the requirement statuses
  never closed (70 proposed / 11 accepted / 0 shipped despite the work being done). Both are
  cheap: mirror the existing `gate` script into a workflow file, and make status-flip-at-archive
  part of the loop, so the spec layer reflects reality instead of trailing it.

### #11 — Олексій Онуфрійчук — Chord Dice (Flutter) — 3.25

Own pre-existing plugin marketplace: `/teams:flow` spawns an Opus planner → Sonnet
implementer/reviewer loop → Opus checker; PreToolUse edit-guards and a loop-safe Stop verification
hook; reviewer rules encode falsifiable project invariants.

- **Steal this**: `/flow:compact`. *What*: a command that distills each completed feature's
  working debris (briefs, plans, review threads) into a committed `summary.md` + decision log +
  dependency map + mental model under `docs/flow/<feature>/`, then deletes the debris. *Why it
  works*: it solves the two-horned memory problem — full transcripts are unreadable context
  bloat, but deleting everything loses the *why*. A distilled, committed digest keeps future
  sessions informed at a fraction of the tokens. *How to adopt*: end every feature loop with a
  compaction step that writes the digest before cleanup — but archive the raw briefs somewhere
  (a branch, a tarball) rather than deleting them, so the digest remains verifiable.
- **Improve**: the single squashed commit erases exactly the evidence the ~20 flow cycles
  generated — and because `/flow:compact` also deleted the briefs, nothing external can confirm
  the pipeline ran. Push the real history and add CI; with hooks this strong, the missing piece
  is letting outsiders see them fire.

### #29 — Євген Мацецка — Jira→Markdown extension — 3.10

Clean 25-commit propose→apply→archive cadence with a PostToolUse hook that auto-commits archived
specs — a tiny deterministic gate welding OpenSpec state to git history; candid three-attempts
narrative and a visible red→green failure/fix pair.

- **Steal this**: the auto-commit-on-archive hook. *What*:
  `.claude/hooks/git-commit-on-archive.sh`, a PostToolUse hook that detects an `opsx:archive`
  operation and immediately commits the archived change-pack. *Why it works*: it makes the
  spec lifecycle and git history *mechanically* inseparable — an archived spec cannot exist
  uncommitted, so the propose→apply→archive cadence is guaranteed to be visible in `git log`.
  It is the smallest possible example of the course's "deterministic code at loop points"
  principle. *How to adopt*: identify the state transitions in your loop that must never drift
  from git (archive, status flip, baseline update) and give each a post-action hook that
  commits it. Also nice: `scripts/export-demo-video.mjs` — the demo recording is scripted and
  regenerable, not a one-off screen grab.
- **Improve**: CodeRabbit produced 32 actionable findings 48 minutes after the last commit, and
  the loop stopped there — no fix commits, no replies. Push an iteration round addressing or
  rebutting them (rebuttal is fine; silence isn't), and add a CI workflow so the 111 tests run
  on every push instead of only locally.

### #24 — Oleksandr Kalyna — Weigh-in Telegram bot — 3.05

The only submission to close the full requirement lifecycle (proposed→accepted→**shipped**,
updated at archive time), sequenced by an explicit PRD→OpenSpec bridge doc; a human smoke test
caught a routing bug that became a regression test.

- **Steal this**: `docs/capabilities.md` as a PRD→OpenSpec sequencing contract. *What*: a bridge
  document mapping all 60 PRD requirement IDs onto 10 ordered OpenSpec changes, with the rule
  that a PRD status flips to `shipped` only when its change-pack archives. *Why it works*: it
  closes the gap most SDD projects leave open — a beautiful PRD and a pile of change-packs with
  no explicit contract between them. Status becomes *earned* by the loop, not asserted by the
  author, so "what's actually done?" has a mechanical answer. *How to adopt*: before
  implementing, write the requirement→change mapping as a table with dependencies; wire status
  flips into your archive step.
- **Improve**: the dynamic-context layer is claimed but absent — the `.cursor` rule mandating a
  `docs/current-state.md` journal is committed, while the journal itself is not. Commit the
  artifact the rule requires; a rule whose output isn't in the repo grades as a claim, and the
  next session genuinely can't resume from it.

### #8 — Andrii Tovstonoh — Bookshelf notes — 2.85

21 genuine spec-first cycles and a great debugging diary (LAN-IP hydration root-cause with proof),
but the single 34k-line "init commit" makes the described process unverifiable.

- **Steal this**: the skill activation signal. *What*: the custom `bookshelf-frontend` skill
  emits a literal marker token when it activates, so the human can see in the transcript that
  the skill actually fired rather than the agent freelancing from priors. *Why it works*: skill
  activation is invisible by default — you cannot tell "followed the design contract" from
  "happened to produce something similar", and silent non-activation is a common, hard-to-debug
  failure. A visible signal makes the context layer *observable*. *How to adopt*: one line in
  the skill's preamble ("emit `[skill:<name>]` on activation"); grep transcripts or logs for it
  when auditing sessions.
- **Improve**: the single 34k-line "init commit" makes the diary's 21 spec cycles unverifiable —
  the handoff doc even cites a commit (`00dd20d`) that doesn't exist in the submitted history.
  Push the real per-cycle commits next time; this submission's grade gap (2.85 vs the diary's
  implied ~3.5 process) is almost entirely the destroyed history.

### #15 — Oleksandr Rohov — Siebel AI code reviewer — 2.85

The meta-idea is the value: an AI reviewer for closed legacy Siebel eScript,
Jira-webhook-triggered, with swappable prompt-cache strategies — plus `DECISIONS.md`, an
agent-maintained log that stops decision relitigation. Process evidence arrived as one squashed
import; 89 CodeRabbit comments unanswered.

- **Steal this**: `DECISIONS.md` as anti-relitigation memory. *What*: an agent-maintained log of
  9 problem→decision→rationale entries that the agent reads before working, so settled questions
  stay settled across sessions. *Why it works*: agents relitigate — every fresh session happily
  re-decides the ORM, the retry policy, the folder layout. A decisions file is episodic memory
  distilled to exactly the entries that prevent churn, far cheaper than replaying transcripts.
  *How to adopt*: add a rule "before proposing an approach, check DECISIONS.md; after any
  contested choice, append to it." The meta-idea also deserves study: pointing agentic review at
  a *closed legacy stack* (Siebel eScript) — where no modern tooling exists — via Jira webhooks,
  with swappable prompt-cache tiers (none/ephemeral/extended) and a provider selector. Applying
  course techniques where tooling is scarcest is where they pay most.
- **Improve**: the work arrived as a one-commit import from an external GitLab project, and the
  QA role's artifacts (the `dev-fix-*` files the process mandates) don't survive — so the
  Dev/QA/Architect separation is only claimable. Preserve the iteration history and answer the
  89 CodeRabbit comments; for a submission whose *product* is an AI reviewer, leaving an AI
  review unanswered is the gap that stings.

### #27 — Max Bugaiov — Colibri Book HOA concierge — 2.75

Turned its own process violation into a permanent always-apply rule with a backfill procedure
("rule was skipped for confirmed bookings; that was wrong"); deploy→15-check-smoke→fix loop
against live staging with real captcha solving.

- **Steal this**: violation→rule conversion. *What*: a `.cursor/rules` entry that documents its
  own origin — a process rule was skipped for confirmed bookings, the skip is named as wrong,
  the rule is now always-apply, and a backfill procedure repairs the affected artifacts. *Why
  it works*: rules born from real failures carry their justification with them, which makes
  agents (and humans) actually respect them; and writing the confession into the rule prevents
  the failure from being quietly normalized. It is the same reflex as a blameless postmortem,
  compressed into the context layer. *How to adopt*: every time you catch yourself or the agent
  bypassing your process, the fix is not just repairing the artifact — it's a new always-apply
  rule stating what happened and the repair procedure.
- **Improve**: three gaps share one root — nothing is enforced: no CI (60 unit tests + Playwright
  exist but run only by hand), 4 squashed commits hide the iteration, and `AGENTS.md` is an
  unadapted Next.js stub while the real rules hide in `.cursor/rules`. Start with CI — it is the
  cheapest conversion of this project's genuinely good verification into a gate.

### #28 — Євген Чайка — MotoRoute planner — 2.70

Exemplary spec layer — the best artifact is `docs/openspec-capabilities.md`, a dependency graph
mapping every requirement ID to an ordered, partially-parallelizable change plan; NFRs verified
by executable performance tests. Sunk by process evidence: four bulk same-named commits and a
reviewer that exists only as a claim.

- **Steal this**: the capability dependency graph. *What*: `docs/openspec-capabilities.md` maps
  every FR/NFR/TC/BC requirement ID onto a graph of OpenSpec changes with explicit dependencies,
  marking which capabilities can be built in parallel. *Why it works*: it is the planning
  artifact that makes multi-agent (or multi-session) execution safe — you can hand independent
  subgraphs to parallel workers without merge chaos, and the build order is an engineering
  decision on record rather than an accident of prompting. *How to adopt*: after writing the
  PRD, spend one planning pass producing the dependency graph before any implementation; revisit
  it at each archive. Also copyable: NFRs as executable tests (`performance.test.ts` asserting
  the <50ms budget of NFR-PERF-02) rather than aspirational prose.
- **Improve**: the four bulk "MVP v1" commits destroyed the trajectory *and* made CodeRabbit skip
  the review — one submission habit caused both biggest losses (C5: 1). Commit per change-pack
  and the same work would likely have scored ~0.5 higher; the claimed fresh-session reviewer
  also needs a committed artifact (role file, findings log) to count.

### #20 — Максим Дмитрук — Monobank jar CLI — 2.55

The PRD's V-1 rule is worth copying: a requirement cannot flip to `shipped` until verified
against the *live* system — and it worked, exposing a doubled-URL bug that fixtures passed.
Honest token-leak disclosure.

- **Steal this**: the V-1 runtime verification gate. *What*: a PRD-level rule that no
  requirement may flip to `shipped` on green tests alone — it must also be verified against the
  live external system, with partial closure tracked in the handoff doc. *Why it works*: it
  paid for itself here — every fixture-based test passed while the real Monobank API rejected a
  doubled `jar/jar/` URL; only the live run caught it, and the bug became a regression test.
  Mocks encode your *beliefs* about the API; a live gate checks the API's beliefs. *How to
  adopt*: add a "verified live: yes/no + date" field to each requirement touching an external
  system, and make the status flip conditional on it.
- **Improve**: there is no checker of any kind in the loop — no reviewer pass, and CodeRabbit's
  14 findings landed seven hours after the last commit and were never addressed. Adding even a
  single fresh-context review pass per capability (plus wiring the existing table-driven tests
  into CI) is the highest-leverage change available.

### #4 — Artur Fomin — Pokédex Explorer — 2.50

Real 15-commit spec cadence and a clever design contract: reference screens exported from a
design tool into `docs/ui-kit-reference/*.jsx` so the agent codes against concrete JSX, not
prose; harness self-improved mid-run (commit-after-archive rule added).

- **Steal this**: reference screens as an in-repo design contract. *What*:
  `docs/ui-kit-reference/*.jsx` — complete reference implementations exported from a design
  tool (Claude Design) and committed, which the agent then reproduces in the real stack. *Why
  it works*: prose design specs ("clean, modern card layout") are the loosest contract in
  agentic development; concrete JSX is unambiguous about spacing, hierarchy, and states, and
  diffable when the agent drifts. *How to adopt*: prototype screens in any tool that emits
  code, commit the exports under `docs/`, and rule that UI work must match the reference. Also
  notable: the harness self-improved mid-run — a "commit-after-archive" rule was added the
  moment its absence caused a problem, loop engineering as a living practice.
- **Improve**: zero automated tests — verification is entirely `tsc`, `next build`, and manual
  browser checks, which is why C4 (the heaviest category) sits at 2 and C5 at 1. Even a small
  Vitest suite over the data layer plus one Playwright smoke per page would have moved this
  submission a full band; that, not more specs, is the next hour of work. (Also: don't commit
  23MB demo videos; link them.)

### #13 — Oleksandr Onufriienko — ForgeFlow inventory — 2.45

Most of the process evidence was backfilled after instructor feedback — but honestly labeled:
`review-findings.json` says `"mode": "retrospective-self-audit"`. That honesty-as-artifact is
itself the lesson.

- **Steal this**: labeled retrospective evidence. *What*: when the instructor noted "0 archived
  change-sets, sample-only evals, 2 test files", the author backfilled the harness — but every
  reconstructed artifact carries `"mode": "retrospective-self-audit"` rather than posing as
  live process. *Why it works*: backfilled evidence presented as earned evidence is the most
  corrosive anti-pattern in this cohort; the label converts a weakness into a trustworthy
  statement of exactly what happened. Paired with #7's `retrofit.json`, it sketches a cohort
  convention: evidence should carry its provenance. *How to adopt*: any artifact created after
  the fact gets a provenance field; your traceability tooling can then weight earned vs
  reconstructed evidence differently.
- **Improve**: run the loop per-slice *during* development instead of as a one-day backfill —
  and treat a self-review that finds zero findings in its own work as a red flag, not a result
  (that is precisely the maker-checking-maker failure the course warns about). The substantive
  response to instructor feedback (commit `119f9d46`: real archives, evals, 10 more test files)
  shows the capability is there; it needs to move left in time.

### #19 — Сергій Пікуля — Conversion-sync SaaS — 2.40 ⚠️ gate fail (no video)

The unique contribution is making each spec-review pass its own commit ("spec 3. review 2") — the
SDD loop is auditable from `git log` alone. But: lint-only verification, 81 unanswered CodeRabbit
comments, and the claimed reviewer skill is an *empty file*.

- **Steal this**: spec-review passes as individual commits. *What*: each specification went
  through committed review rounds — commits titled "spec 3. review 1", "spec 3. review 2" — with
  substantive diffs (one review pass rewrote 111 lines of spec). *Why it works*: it does for the
  *specification* what red→green commits do for code: the refinement trajectory becomes public
  history, showing the specs were argued with rather than generated-and-accepted. It is the
  cheapest possible trajectory evidence — no tooling, just commit discipline. *How to adopt*:
  commit after every spec review round with a consistent naming scheme; the diff *is* the
  review artifact.
- **Improve**: verification is the hole the submission falls through — `package.json` has
  lint only, no test framework, no CI, and the two claimed checker artifacts dissolve on
  inspection (`.agents/skills/review-task` is an empty file; 81 CodeRabbit comments got zero
  replies). Before anything else: submit the missing demo video — it is a hard course gate, and
  the strongest spec-craft in the B band currently fails the assignment on a formality.

### #30 — Егор Березовський — Vue resume site — 2.35

A cautionary tale about uncommitted evidence: excellent E2E-as-agent-contract (20 Playwright
specs, 3-job CI, multi-round CodeRabbit re-reviews across 9 real PRs) — but CLAUDE.md, plans,
context log, and the custom MCP were all kept local, so most categories score as claims.

- **Steal this**: file-based semaphores for parallel agent sessions. *What*: three agent
  sessions worked the repo in parallel while sharing a single-session Playwright MCP, coordinated
  through signal files acting as semaphores with timed retries — plus the discipline of E2E
  tests as the agent's explicit pass/fail contract ("тести спасали"), one spec per use case,
  enforced by 3-job CI on every PR. *Why it works*: multi-session agent work usually collides on
  shared single-instance resources (a browser, a dev server, a device); a filesystem semaphore
  is a zero-dependency mutex any agent can honor from a one-line rule. *How to adopt*: define a
  lock-file convention (`.locks/<resource>`), add acquire/retry/release rules to your agents'
  static context, and let CI own the arbitration of truth.
- **Improve**: commit the process. The CLAUDE.md, iteration plans, context log, and the custom
  MCP/sync scripts all exist only on the author's machine — explicitly "kept local" — so C1 and
  C2 grade at 1 despite the strongest CI discipline in the C band. The delta between this
  submission's practice and its score is the largest in the cohort, and it is entirely a
  publishing decision away from closing.

### #18 — Ігор Гринчишин — YouTube transcription — 1.75

Substantive project-specific spec suite and a genuine 20-point `CHECKER_PROMPT.md` with paired
"Accepted when / Rejected when" clauses — but the entire 42-file app landed in a single commit
and 18 CodeRabbit comments got a README-only response. Development happened outside git, so the
process is unverifiable.

- **Steal this**: paired acceptance/rejection clauses. *What*: `docs/ACCEPTANCE_CRITERIA.md` and
  the 20-point `CHECKER_PROMPT.md` phrase every criterion as a pair — "Accepted when …" plus an
  explicit "Rejected when …" — forming an adversarial reviewer contract. *Why it works*:
  acceptance-only criteria give a checker agent every incentive to pattern-match toward "pass";
  an explicit rejection clause gives it something concrete to *hunt for*, which is what makes a
  checker adversarial rather than ceremonial. *How to adopt*: when writing acceptance criteria,
  force yourself to write the failure condition beside each success condition; feed both to the
  reviewing agent.
- **Improve**: develop *in* git. The entire 42-file application landed as one commit, the
  described checker loops left no artifacts (no findings, no fix rounds), the well-written
  `CURSOR_RULES.md` isn't even wired into `.cursor/rules`, and the post-review commit touched
  only the README while 18 CodeRabbit findings sat unanswered. The specs prove planning
  happened; nothing proves the *process* did — and process was the assignment.

### #21 — Eugene Chernyshov — Transon Visual Editor — 3.85 *(self, excluded from ranking)*

Graded by an independent agent pass: enforced gates (8 CI checks incl. a maturity ratchet that
fails if the harness itself regresses), 147-example round-trip corpus against a pinned engine
wheel, reviewer with documented catches, evidence-based retros that honestly log deviations
("implementer often skipped, review-gate never ran" — which is exactly what cost C3 a point).

- **Steal this**: the maturity ratchet. *What*: `check_maturity.py` compares the harness's
  measured state (gate coverage, corpus size, traceability completeness) against a committed
  `maturity-baseline.json` and fails CI on any regression — the harness guards *itself*, not
  just the product code. *Why it works*: agentic harnesses rot in a characteristic way — a gate
  gets commented out to unblock one change and never restored. Ratcheting the harness makes its
  own erosion a build failure. *How to adopt*: enumerate your harness's measurable properties,
  commit them as a baseline, and add a CI check that the baseline only moves forward.
  Honourable mention: per-session retros with a "not observed" discipline — deviations logged
  as data, which is where this grade's own deduction came from.
- **Improve**: enforce the inner loop on its author. The retro honestly records that the
  delegation path was often skipped and the review-gate workflow never ran — the harness's
  gates bind the executor but not the orchestrator. The fix is the same medicine the top
  submissions took: make the review-gate a blocking precondition (hook or CI) for merging any
  slice the orchestrator implemented directly, so maker≠checker survives convenience.

## Cohort synthesis

**What the class adopted.** Spec-driven development won decisively: ~22/27 submissions have
stable requirement IDs and OpenSpec change-packs; AGENTS.md/CLAUDE.md is near-universal;
`docs/current-state.md` handoff journals appear in most A/B submissions. Verification was the
strongest category — real test suites are the norm, and eight submissions built genuine *evals*
distinct from tests.

**What the class ignored.**

1. **Maker ≠ checker is the weakest practice** — repeatedly claimed, rarely evidenced: an empty
   reviewer file (#19), a dangling `reviewer.md` reference (#9), reviewer agents defined but
   never demonstrably invoked (#6, #28). The submissions that did it well (#12's cold-start
   review, #14's four reviewer roles, #25's verdict files) all caught real bugs — the practice
   pays.
2. **Git history as evidence** — at least seven submissions squashed or batch-recommitted,
   destroying exactly the trajectory the course grades.
3. **CI** missing even in otherwise strong entries.

**Systemic finding for the instructor.** The mandated CodeRabbit review round silently failed for
roughly half the cohort: any PR over ~150 files was skipped, and almost nobody re-scoped or
re-requested. Only #17 and #30 (own-repo PRs) had real multi-round iteration. If the review loop
is a graded practice, the assignment needs per-slice PRs or a file-cap warning baked in.

**Top ideas to steal, cohort-wide:**

1. **Machine-checked honesty** — #14's `check-claims.mjs` + durable red-run/green-run JSON.
2. **Hallucination-proof evals** — #17's fictional corpus domain.
3. **Blocking Stop hooks** — #6/#22: the agent cannot end its turn red.
4. **Trajectory evals** — #10: judge the path, not just the output.
5. **Honest retrofit labeling** — #7's `retrofit.json`, #13's `retrospective-self-audit`.
6. **Portable loops** — #16's SKILL/PROFILE split; #11's plugin marketplace.
7. **Live-run gate** — #20's V-1: nothing ships until verified against the real system.
8. **Reuse-vs-authored ADR** — #12: declare your engineering fingerprints.

**What could not be verified anywhere:** video contents (presence only), self-reported test/eval
runs and LLM-judge scores, local-only artifacts, and anything behind squashed history. Scores
rest on committed artifacts per the "no artifact → cap at 1" rule.
