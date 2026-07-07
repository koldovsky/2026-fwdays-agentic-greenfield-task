# LOOP.md

Execution flow for agents driving **automatic implementation of OpenSpec change proposals** in this repo ("Loop Engineering"). This is a process description, not a script — an agent (or a human directing one) follows these steps each cycle. Load `AGENTS.md` first; this file assumes its house rules and does not repeat them.

## Goal

Turn the backlog of proposed-but-unimplemented OpenSpec changes under `openspec/changes/**` into archived, working capabilities, one change at a time, without silently violating dependency order, verification gates, or the human review checkpoint.

## Unit of work

One **cycle** = one OpenSpec change, taken from "pending" to "archived" (or paused at a documented blocker). A cycle is never split across multiple changes, and never skips ahead to a later change while an earlier prerequisite is still unarchived.

## Preconditions before starting a cycle

1. `openspec/changes/archive/` is the source of truth for what's already shipped. List it before picking a target.
2. `docs/capabilities.md` defines the dependency graph (`Depends on` column) and phase ordering (Phase 0 → 4). A change may only start if every capability it depends on is already archived.
3. `openspec/config.yaml` (`rules.proposal`) encodes the same rule from the proposal side: a change "refuses to start until prereqs are archived." Treat a violation here as a hard stop, not a judgment call.
4. If two or more pending changes have all prerequisites satisfied (e.g. parallel capabilities in the same phase), pick the lowest-numbered capability ID first — do not parallelize implementation across changes in one cycle.

## Per-cycle algorithm

1. **Select the change.**
   - `ls openspec/changes/` minus `archive/`.
   - Cross-reference against `docs/capabilities.md` to find the next unarchived capability whose dependencies are all archived.
   - Announce the selection and why (which capability ID, what it unblocks).

2. **Inspect status.**
   - `openspec status --change "<name>" --json` — confirm planning artifacts (proposal/design/specs/tasks) are complete. If not, stop and hand off to `opsx:propose` / `opsx:explore` instead of guessing at missing design.

3. **Get apply instructions.**
   - `openspec instructions apply --change "<name>" --json` — read `contextFiles`, `progress`, and `state`.
   - `state: "blocked"` → stop, report what's missing.
   - `state: "all_done"` → skip straight to archive (step 6).
   - Otherwise read every file under `contextFiles` before writing any code.

4. **Implement via `opsx:apply`.**
   - Work through `tasks.md` top to bottom. Each task: make the minimal change it describes, flip `- [ ]` to `- [x]` immediately, move on.
   - Pause (do not guess) on: ambiguous task wording, a design gap discovered mid-implementation, or an error/blocker. Report and wait for guidance rather than improvising past it.
   - Respect `AGENTS.md` house rules throughout (AccessToken handling, single-origin, DS-only front-end styling, per-TV serialization, etc.) — these apply regardless of which change is in flight.

5. **Verify.**
   - Run the gate from `AGENTS.md` → Verification: `npm run back:build` for back-end changes, `npm run front:build` (+ manual `front:dev` eyeball) for front-end changes.
   - **Run tests, and require them to pass, whenever this change's `tasks.md` adds any.** `npm run back:test` / `npm run front:test` from repo root. A task that says "add a test" is not done just because the checkbox is `[x]` — the test must exist and the run must be green. If the package has no `test` script yet, that's a gate failure for this change (wire it up as part of the task), not a reason to skip the check.
   - A failing gate — build or test — ends the cycle in a paused state — fix-forward within the same change, don't archive on red.

6. **Independent review — fresh-context agent, mandatory before archive.**
   - Spawn the `code-reviewer` subagent (`.claude/agents/code-reviewer.md`) via the Agent tool, passing only the change name. Do **not** paste in a summary of what you did — its value is that it starts from zero context and re-derives everything from `proposal.md`/`design.md`/`spec.md`/`tasks.md` and the actual diff, so it isn't anchored to the implementer's account of its own work.
   - `PASS` → proceed to archive.
   - `CHANGES_REQUESTED` → go back to step 4, address every finding, re-run step 5 (verify), then re-run this step. Do not archive on unresolved findings, and do not talk yourself out of a finding without a code-level reason.

7. **Archive.**
   - Only after verification is green **and** the reviewer's verdict is `PASS`: invoke `opsx:archive` to move the change into `openspec/changes/archive/` and sync its delta specs into the main spec set.
   - The last task in every `tasks.md` is prepending an entry to `docs/current-state.md` (per `AGENTS.md` → Session log) — confirm it happened before calling the cycle done.

8. **Auto-commit — only when every gate above is green.**
   - Preconditions, all required: back-end/front-end build verification passed (step 5), `code-reviewer` verdict is `PASS` (step 6), and the change is archived (step 7). If any gate failed or was skipped, do **not** commit — leave the working tree for a human to inspect.
   - Inspect `git status --short` and stage only the files that belong to this cycle (implementation files under `back-end/`/`front-end/`, the moved `openspec/changes/<name>` → `openspec/changes/archive/<name>` files, any synced `openspec/specs/**`, and the `docs/current-state.md` entry). Do not use `git add -A`/`git add .` — a stray untracked file from unrelated work should never ride along silently.
   - Never stage `.env`/credentials or anything already `.gitignore`d.
   - Commit message: a subject line naming the capability shipped (e.g. `Implement <capability name> (C<N>)`), a short body summarizing what was done (bullet the key pieces: server/route/component added, tests added, docs updated), and end with:
     ```
     Co-Authored-By: Claude <noreply@anthropic.com>
     ```
   - One commit per cycle — do not fold multiple changes into one commit, and do not amend a prior commit. Never `--no-verify` or force-push.
   - If the pre-commit hook fails, fix the underlying issue, re-stage, and create a new commit — do not bypass the hook.
   - This commits locally only. Never `git push` as part of the loop — pushing is a separate, explicit action outside this flow.

9. **Stop.**
   - Summarize what shipped (capability ID, files touched, tests added, reviewer verdict, commit SHA, anything deferred).
   - **Do not start the next change automatically.** Wait for an explicit human go-ahead ("continue", "next", etc.) before beginning the next cycle.

## Why no fixed-interval scheduler

A cron-style recurring trigger (e.g. `/loop 10m ...`) fires again on a wall-clock timer regardless of whether the previous cycle's output has actually been reviewed. Implementation time per change is unpredictable (a handful of tasks vs. 20+), and step 7's review checkpoint only has teeth if the next cycle genuinely waits for a human. So this flow is driven **on-demand**: each cycle runs once when invoked, then idles until told to continue. If a durable/recurring driver is wanted later, it should poll for "is there an unreviewed completed cycle?" and no-op rather than blindly starting new work.

## Stop conditions (never guess past these)

- Prerequisite capability not yet archived.
- `tasks.md` already fully checked off but not archived (state `all_done`) — go straight to archive, don't re-implement.
- A task's requirement is ambiguous or contradicts `docs/requirements.md` / `AGENTS.md`.
- Verification gate fails.
- Implementation reveals the design/spec is wrong — stop and propose an artifact update instead of silently diverging from `design.md`/`spec.md`.
- The `code-reviewer` agent returns `CHANGES_REQUESTED` and the findings haven't all been resolved and re-reviewed.

## Why the reviewer runs in a separate, fresh-context agent

The agent that implements a change is a poor judge of its own work — it already believes its task checkboxes and rationalizes edge cases it didn't think of. Spawning `code-reviewer` fresh (via the Agent tool, `subagent_type: code-reviewer`, no prior conversation) forces it to re-derive correctness from `proposal.md`/`design.md`/`spec.md`/`tasks.md` and the diff alone, the same way a human reviewer who wasn't in the room would. It is read-only by design (`Read`/`Grep`/`Glob`/`Bash` only, no `Edit`/`Write`) so review and fix stay separate steps — see `.claude/agents/code-reviewer.md`.

## Cross-reference

- Capability catalogue & dependency graph: `docs/capabilities.md`.
- Per-change planning artifacts: `openspec/changes/<name>/{proposal,design,tasks}.md`, `specs/**`.
- Apply mechanics: `opsx:apply` skill. Archive mechanics: `opsx:archive` skill.
- Independent review: `.claude/agents/code-reviewer.md`.
- House rules every cycle must respect: `AGENTS.md`.
