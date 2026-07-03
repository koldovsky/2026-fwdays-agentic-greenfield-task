# Harness Effectiveness Review — M0–M5

> ⚠️ **One-off retrospective. NOT part of the harness contract.**
> This folder exists to assess how the AI-development harness performed across the
> milestone run. It is **not** a spec, guide, or rule. Agents implementing features or
> milestones **must not read, follow, or cite anything under `retro/`** — the contract is
> `AGENTS.md` + `docs/`. Nothing here feeds future development.

## What this answers

The plan in `docs/ROADMAP.md` was executed **one milestone per fresh agent session**. This
review captures, per session, **what actually happened** in terms of *following the harness*
and *AI-assisted development* — not the feature scope. The goal is an honest read on where the
harness helped, where it was skipped, and where it got in the way.

This is a **process** review, not an outcome one. It is distinct from
[`roadmap-effectiveness-gap-analysis.md`](roadmap-effectiveness-gap-analysis.md) (outcome vs.
verifiable repo state). The per-session reports here are the *basis* of the synthesis below —
and *optional supporting evidence* there.

## Method

- One fresh session per milestone (M0–M5).
- At the **end of each session**, the user delegates the *Session report prompt* (below) **inside
  that same session**, so the agent can see its own history.
- Each session writes one file: `retro/sessions/M<N>.md`, using the *Session report template*
  (below). The session reports are kept aside as separate files — see the table.
- After all sessions are reported, the *Synthesis prompt* (below) rolls them up into the
  synthesis sections of this document (§1–§3).

## Evidence rule (the whole point)

Every statement must come from what *actually occurred* in
the session — commands actually run, tools/subagents actually invoked, files actually changed,
outputs actually seen, messages actually exchanged. Do **not** reconstruct what the harness *says
should* happen, and do **not** invent. Unknown ⇒ write `not observed`.

## Sessions (reports kept aside)

| Milestone | Scope (from ROADMAP) | Report |
| --- | --- | --- |
| M0 | Engine `switch`/`cond` + projection-ready export + test harness | [sessions/M0.md](sessions/M0.md) |
| M1 | `editor-core`: codec skeleton + `G_encode`/`G_decode` for one rule | [sessions/M1.md](sessions/M1.md) |
| M2 | Full catalog: fold every rule into the generated codec | [sessions/M2.md](sessions/M2.md) |
| M3 | `editor-blockly`: `G_palette`/`G_toolbox` + Zelos + behavior runtime | [sessions/M3.md](sessions/M3.md) |
| M4 | `editor-ui` + `editor-element`: shell, host execution, bidirectional sync | [sessions/M4.md](sessions/M4.md) |
| M5 | React entry, examples, embedding, accessibility & self-hosting | [sessions/M5.md](sessions/M5.md) |

Synthesis across all sessions: §1–§3 below.

---

> **Synthesis (§1–§3):** derived only from the six session reports `retro/sessions/M0.md..M5.md`.
> No other source consulted.

## 1. Per-milestone summary

| Milestone | Harness steps observed | Friction / skips | Human interventions |
|---|---|---|---|
| **M0** — scaffolding + Node→Python adapter | `/run-milestone M0`; subagents `milestone-planner`, `general-purpose` (build), `round-trip-reviewer`; gates all green (engine-parity, traceability, links, maturity, evals, typecheck/test/build); traceability + ROADMAP in the commit; `update_memory.py --state` handoff. | Test-first only partial (build subagent ran autonomously). `transon` not importable via bare `python3` → used venv. Local venv (v0.1.2) ahead of pinned commit; no re-pin. Reviewer flagged a hardcoded venv path (fixed) and mislabelled the intended pre-commit tree a "merge blocker". `review-gate` workflow not run. | Q&A on the implementation routine/commands; a clarify Q on options 1 vs 2; chose "Commit on the branch". |
| **M1** — codec skeleton + `G_encode`/`G_decode` for `attr` | `/run-milestone M1`; `milestone-planner`; `round-trip-reviewer` ×2 (resumed via SendMessage); 16-task tracker; gates green incl. new `check_no_codec_mapping`; snapshot re-pin v0.1.3. | Deviation: codec built in main session, not delegated to `requirement-implementer` (surfaced to user). Regen double-build cycle. Tooling friction (heredoc/apostrophe → `git commit -F`; `git mv` on untracked; null-bytes). Engine-metaprogramming corrections found via scratch spikes. Commit-msg hook rejected missing `Refs:`. 2 must-fix + 1 should-fix from review. | Chose via AskUserQuestion "T7 + FR-063, fully finish M1"; directed "emit committed then finish"; several clarifying Qs incl. "is the reviewer running?". |
| **M2** — full catalog fold | `/run-milestone M2`; `milestone-planner`; `requirement-implementer` ×4 (2 completed); `round-trip-reviewer` ×3 (no must-fix); gates green; 915 tests; traceability + SPEC in each slice; `--state` ×2. | ~118 orphaned vitest workers accumulated (user flagged; killed). `runner.py` crash on `NoContent` + no timeout → hardened. 147-example corpus surfaced a real escape-collision bug reviewer had rated NIT. D3/D4 finished in-session after D3 killed twice. Regen stale-artifact trip. `--snapshot` not run; `review-gate` not run. | "are tasks stuck?"; "are tests that slow?"; "how long expected?"; AskUserQuestion (restart D3 / fix properly); "fix all of that, don't bypass harness"; deferred-items inventory request. |
| **M3** — editor-blockly: palette/toolbox + Zelos + behavior runtime | `/run-milestone M3`; `milestone-planner`; `round-trip-reviewer`; 6-item tracker; gates green incl. new `check_presentation` + `check_behavior_runtime_size`; 1387 tests; traceability in slices, ROADMAP/current-state in final commit; `--state`. | New gates each FAILED first run (regex missed a `reg` alias; doc-comment false-positive) → fixed. Encoder array assertion failed. Headless Blockly import errored twice → resolved. Palette/toolbox double-build bootstrap. `review-gate` not run. | Answered AskUserQuestion (presentation defaults); asked whether real-Blockly validation exists. |
| **M4** — editor-ui + editor-element: shell, host execution, bidirectional sync | `/run-milestone M4`; `milestone-planner`; `round-trip-reviewer`; gates green; traceability in slices; `--state`. | Test-first mostly no. Blockly 13 `inject` failed under jsdom → locale + SVG/canvas stubs. AC-038 change broke 4 resave tests. Highlight test needed rendered mount. §7.15 test hit rootDir/circular-dep/disposal issues → rewritten with a fake engine. Heredoc → `git commit -F`; `Refs:` trailer. Slices done directly, not delegated. 1 must-fix (surface check matched `transon_unsupported` as data). `review-gate` + `--snapshot` not run. | AskUserQuestion ×2 (asked for pros/cons/effort/impact then chose mutator + eager-Pyodide/gate-projection options). |
| **M5** — React entry, examples, embedding, a11y, self-hosting | `/run-milestone M5`; `milestone-planner`; `round-trip-reviewer` (SAFE TO MERGE, 1 should-fix); gates green (mostly via pre-commit); 1551 tests; traceability in slices; `--state`; live Playwright/axe browser check. | Commit-msg `Refs:` rejection; apostrophe → `git commit -F`. Corpus count 147→89 (dedupe). Progressive-disclosure default broke earlier tests. axe/a11y iterations (labels, `role=status`, malformed `axe.run`). Self-hosting `G_encode`/`G_decode` exceeded recursion ceiling → rescoped to palette/toolbox. D6 accidentally committed Playwright artifacts → amended. `--snapshot` not run; `review-gate` not run standalone. | AskUserQuestion (theming = Chrome-only CSS vars; a11y = add AC-039). |

## 2. Cross-session findings

- **Every milestone was driven the same way and it held:** `/run-milestone M*` → `milestone-planner` (read-only locked plan) → build → `round-trip-reviewer`. All six report this shape and all six flipped their ROADMAP tracker to ☑ with gates green (M0–M5 "Harness steps"/"Outcome" sections).
- **The `round-trip-reviewer` (maker≠checker) caught real defects the first pass missed** — 2 must-fix in M1, a corpus-surfaced escape-collision that M2's first review had rated only a NIT, an empty-array decode crash in M3, the `transon_unsupported`-as-data surface hole in M4. This adversarial pass was the most consistently valuable step.
- **The designated `review-gate` workflow was never run in any session** — every milestone substituted the `round-trip-reviewer` subagent instead (explicit in M0–M5 "Gates run" / "Not observed").
- **`requirement-implementer` delegation was routinely skipped;** implementers ran the slices directly (M1 codec, M2's D3/D4 after two kills, M4 all slices, M5). The subagent was used only in M2 and even there completed just 2 of 4 launches.
- **Test-first was only ever "partial";** across M0–M5 tests were generally written alongside/after implementation, though red tests frequently drove fixes (corpus counts, axe scans, resave coercion, recursion ceiling).
- **New gates and the adapter were themselves buggy on introduction:** M3's `check_presentation`/`check_behavior_runtime_size` both failed their first real run, and M2 found `runner.py` crashed on `NoContent` with no timeout (spawning ~118 zombie vitest workers) — recurring friction was tooling/regen (double-build cycles) and shell commits (`Refs:` trailer, apostrophe → `git commit -F`), seen in M1, M2, M4, M5.

## 3. Confidence / gaps (items reports marked "not observed")

- **Test-first internal ordering** inside autonomous subagents was not directly observed (M0, M1, M2).
- **`update_memory.py --snapshot`** was not run in M2, M3, M4, M5 (only M0/M1 re-pinned).
- **No branch push or PR** occurred in any session (M0–M5 all note this).
- **`review-gate` workflow** and (except M2) **`requirement-implementer`** were not exercised.
- **Real in-browser / interactive validation was limited:** M3 Blockly rendering was headless-only; M4's Pyodide load was against a fake (jsdom can't load Pyodide); M5 ran a live Playwright/axe check but committed no CI job for it.
- **Wall-clock durations / token usage** were not observed in any session; engine-side M0 correctness was not re-reviewed (M0). Some post-final-commit working-tree edits (M1, M3) were made outside the sessions and are unverifiable there.

---

## Session report template (structure for `retro/sessions/M<N>.md`)

```markdown
# Session retrospective — M<N>: <milestone name as seen in this session>

> One-off harness retrospective. Evidence-based: only what happened in this session. Not a contract.
> Any field you cannot support from this session's history ⇒ write `not observed`.

- **Session date / model:**
- **How the session started:** _(the exact command/prompt that kicked it off, e.g. `/run-milestone M2`)_
- **Milestone worked on:** M<N> — _(name as it appeared in the session)_

## Harness steps actually taken
- **Commands / skills invoked:** _(only ones actually run)_
- **Subagents used:** _(which agent types, for what — only if actually spawned)_
- **Test-first observed?:** _(yes / no / partial — cite what was seen, e.g. a failing test written before impl)_
- **Gates run & result:** _(check_traceability / check_engine_parity / check_maturity / run_evals / review-gate — only those actually executed, with pass/fail)_
- **Traceability / docs updated in the same change?:** _(observed yes/no)_
- **Memory / handoff refreshed?:** _(update_memory.py --state / --snapshot — observed yes/no)_

## Friction, deviations, skips
- _(only things actually observed — a gate that failed and was rerun, a step skipped, a wrong turn corrected)_

## Human interventions
- _(clarifications or corrections the user gave mid-session — only if they happened)_

## Outcome
- **What landed:** _(commits / files — only if observed)_
- **Milestone/DoD status as stated in the session:**

## Not observed / unverifiable
- _(explicit gaps — anything you cannot support from this session's history)_
```

## Session report prompt (delegate at the end of each milestone session)

Copy this verbatim into the session that just finished a milestone. Set `<N>` to that
milestone's number.

```text
Write a short retrospective of THIS session into `retro/sessions/M<N>.md`
(set <N> to the milestone this session worked on).

Hard rules:
- Base EVERY statement only on what actually happened in this session: commands you actually
  ran, tools/subagents actually invoked, files actually changed, outputs actually seen, and
  messages actually exchanged with me.
- Do NOT read AGENTS.md, docs/, or the ROADMAP to reconstruct what "should" have happened.
  Do not describe any harness step unless it actually occurred in this session.
- If a field is unknown or was not observed, write "not observed". Never guess, infer, or
  fill gaps. Do not make anything up.
- Keep it very brief — bullet points, one or two sentences each.
- Use the exact structure of the "Session report template" section in
  `retro/harness-effectiveness-review.md`. Fill only what this session's history supports;
  mark everything else "not observed".
- This is a one-off retrospective. Do not treat it as a contract, and do not change any other
  code or docs. Writing this one file is the entire task.

When done, print the path of the file you wrote.
```

## Synthesis prompt (delegate once, after all six reports exist)

```text
Read only the six milestone reports `retro/sessions/M0.md..M5.md` — do not read any other file to
reconstruct or "correct" them. Fill the synthesis sections (§1–§3) of
`retro/harness-effectiveness-review.md` in place with:
- A one-row-per-milestone table: Milestone | Harness steps observed | Friction/skips | Human
  interventions.
- 3–6 bullets of cross-session findings (patterns in what helped, what was skipped, what got
  in the way) — each grounded in a specific session report.
- One short "confidence / gaps" note listing anything the reports marked "not observed".
Base every statement only on the six session reports. Do not invent. Keep it brief.
```
