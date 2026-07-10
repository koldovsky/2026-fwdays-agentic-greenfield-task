# Git hooks (deterministic harness)

Version-controlled git hooks. They are **not active until you point git at them**:

```sh
git config core.hooksPath .githooks
```

Run that once per clone (it writes to your local `.git/config`; it is not committed).
CI runs the same checks independently, so the hooks are a fast local mirror, not the
only line of defense.

## Hooks

| Hook | Runs | Blocks the commit when |
| --- | --- | --- |
| `commit-msg` | `scripts/check-commit-msg` | the message has no `Refs:` or `Slice:` trailer (merge/revert/fixup messages are exempt). |
| `pre-commit` | `scripts/pre-commit-run` | a staged secret / real `.env` is detected, or ruff fails on staged backend files. It also regenerates `docs/qa/traceability.md` and `docs/qa/trajectory.md` and **self-stages** them so a committed matrix is never stale. |

Both wrappers are POSIX `sh` and delegate to stdlib-Python helpers, so they work on
Linux, macOS, and Windows (Git for Windows runs hooks under its bundled `sh`). If
`python` is not on `PATH` they warn and skip rather than hard-blocking your commit.

## Bypass (discouraged)

`git commit --no-verify` skips both hooks. Per [AGENTS.md](../AGENTS.md) do not skip
hooks unless explicitly agreed; CI will still fail on the same conditions.

## What they intentionally do NOT do

- No frontend `tsc`/eslint (slow); that runs in the `post-edit-lint` Claude hook and
  in CI. See [`.claude/hooks/README.md`](../.claude/hooks/README.md).
- No full test run; that is `scripts/gate-slice` and CI.
