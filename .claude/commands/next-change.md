---
name: "Next change"
description: Run one Loop Engineering cycle — implement, review, verify, archive, and commit the next pending OpenSpec change, then stop for human review.
category: Workflow
tags: [workflow, openspec, loop]
---

Run exactly **one cycle** of `LOOP.md` — the automatic-implementation loop for this repo's OpenSpec change backlog.

**Input**: Optionally a change name (e.g. `/next-change platform-foundation`). If omitted, select per `LOOP.md`'s "Preconditions" — the next unarchived capability in `docs/capabilities.md` whose dependencies are all archived.

**Steps**: read `LOOP.md` in full and follow its "Per-cycle algorithm" section exactly, in order, for the selected change:

1. Select the change (or use the one given as an argument, but still verify its prerequisites are archived — refuse and stop if not).
2. Inspect status (`openspec status`).
3. Get apply instructions (`openspec instructions apply`) and read every `contextFiles` entry.
4. Implement via `opsx:apply` — work `tasks.md` top to bottom, checking off tasks as you go. Pause on ambiguity, design gaps, or errors rather than guessing.
5. Verify: `npm run back:build` / `npm run front:build` per `AGENTS.md`, **plus `npm run back:test` / `npm run front:test` whenever this change's `tasks.md` adds tests** — a checked-off test task with no passing run is not done. Missing `test` script counts as a failure, not a skip.
6. Independent review: spawn the `code-reviewer` subagent fresh with just the change name — no summary of what you did. On `CHANGES_REQUESTED`, fix and re-run steps 5–6 until `PASS`.
7. Archive via `opsx:archive`, confirming the `docs/current-state.md` entry landed.
8. Auto-commit — only if steps 5–7 all succeeded. Stage only this cycle's files (no `git add -A`), write a message naming the capability shipped, and end it with `Co-Authored-By: Claude <noreply@anthropic.com>`. Never push, never `--no-verify`, never amend.
9. Stop. Summarize what shipped (capability, files, tests, reviewer verdict, commit SHA, anything deferred) and wait for an explicit go-ahead before the next `/next-change` invocation.

Do not skip step 6 or 8, and do not chain into a second change in the same invocation — one `/next-change` call is one cycle, full stop. If `LOOP.md`'s stop conditions are hit (prereq not archived, ambiguous task, failing gate, unresolved review findings), report the blocker and wait — do not improvise past it.
