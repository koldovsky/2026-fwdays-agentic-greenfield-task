---
name: sync-current-state
description: Read and update docs/current-state.md — the live session handoff (last action + timestamp, working-on requirement IDs, next steps, blockers). Use at session start to load context, and before finishing any unit of work.
metadata:
  author: vouch
  version: "1.0"
---

Keep the cross-session handoff current. This is how a loop survives context resets: the next session reads where the last one stopped.

**Steps**

1. **Read first.** Open `docs/current-state.md` — treat it as the handoff from the previous session before doing anything else.

2. **On finish, overwrite** (do not append) with:
   - **Updated:** ISO date (`YYYY-MM-DD`, add time if known).
   - **Last action:** what was just done.
   - **Working on:** current requirement IDs (`FR-*` / `NFR-*` / `TC-*` / `BC-*`).
   - **Next steps:** concrete next actions for whoever picks up.
   - **Blockers / open questions:** anything unresolved.

3. **Cross-check** the "last action" against real state — `git status` / `git diff --stat` — so the log matches reality.

4. **Trim** stale content; keep it ≤ ~40 lines and current.

**Guardrails**
- Single source of truth for *now* — it is not a changelog; don't accumulate history.
- Always refresh the timestamp on every update.
- If nothing is in flight, say so explicitly rather than leaving stale "working on".
