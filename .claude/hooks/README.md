# Inner-loop Claude Code hooks

Fast feedback while an agent works. These are wired in
[`.claude/settings.json`](../settings.json) (committed, team-shared) and reuse the
repo's existing verify tools -- they add no new checks of their own.

| Hook | Event | Does | On failure |
| --- | --- | --- | --- |
| `post-edit-lint` | `PostToolUse` (Edit/Write/MultiEdit) | Lints the just-edited file: `ruff` on a `backend/**.py`, `tsc -p` (strict) on a `frontend/**.ts[x]`. | Writes the errors to stderr and exits 2, so Claude gets them as feedback and fixes them. |
| `stop-verify` | `Stop` (turn end) | If any `backend/**.py` changed vs HEAD, runs the mapped pytest subset (`app/x.py -> tests/test_x.py`, plus changed test files; else the full suite). Sets `RUN_DB_TESTS=1` when Postgres is reachable, else notes DB tests were skipped. | Writes a short failure tail to stderr and exits 2, so Claude fixes the regression before ending. |

Both are stdlib-only Python, exit 0 on anything they can't or shouldn't check
(unknown file type, toolchain not installed, no backend change, or an internal
error), and never block the session spuriously.

## Enabling / disabling

They are **on by default** via `.claude/settings.json`. Requirements:

- `python` must be on `PATH` (the hooks are stdlib-only; any 3.10+ works). On a
  machine where the interpreter is `python3`, change `"command": "python"` to
  `"python3"` in `.claude/settings.json`.
- `ruff` / `pytest` come from `backend/.venv` (run the backend install in
  [AGENTS.md](../../AGENTS.md)); `tsc` comes from `frontend/node_modules`. If a
  toolchain is missing the relevant hook quietly no-ops.

To turn a hook off locally without editing the shared file, override it in
`.claude/settings.local.json` (git-ignored). To turn it off for everyone, remove its
block from `.claude/settings.json`.

`stop-verify` is intentionally **blocking** (exit 2 halts the turn and feeds the
failure back to the model). If you are mid-way through a deliberately red change,
disable it locally as above rather than fighting it.

## Relationship to the other gates

These are the *inner* loop (per-edit, per-turn). The *outer* loop is
[`scripts/gate-slice`](../../scripts/gate-slice) (full battery + coverage ratchet),
the [git hooks](../../.githooks/README.md) (commit-msg + pre-commit), and
[CI](../../.github/workflows/ci.yml). Same tools, different cadence.
