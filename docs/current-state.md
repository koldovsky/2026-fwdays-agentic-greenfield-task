# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-02T07:52:00+00:00** — Archived the `add-cli-orchestration`
OpenSpec change: synced its delta spec into a new main spec at
`openspec/specs/cli-orchestration/spec.md` (5 requirements — single
plan-file argument, parse-before-fetch ordering with no output on a
fatal precondition, single fetch call per run, distinct fatal message
per fetch failure with no retry, three-tier exit code contract — added
verbatim, validated with `openspec validate cli-orchestration --strict`),
then moved the change folder to
`openspec/changes/archive/2026-07-02-add-cli-orchestration/`. The
`cli-orchestration` capability (`cmd/jarsplit`) covers FR-FAIL-01,
FR-EXIT-01, TC-MODULE-01, and is implemented and tested (see prior
action: `run`/`describeFetchError`/`exitCode`, 11 tests, manual binary
run confirmed correct). `openspec list` now shows no active changes —
**all 6 phases of
[openspec-capability-plan.md](openspec-capability-plan.md) are archived**
(`plan-parsing`, `mono-client`, `jar-matching`, `link-generation`,
`output-reporting`, `cli-orchestration`), and `jarsplit` is a real,
runnable binary implementing every FR/NFR/TC/BC in
`docs/product-requirements.md`.

## Next step

Only one open item remains project-wide: the **V-1** manual verification
gate on `FR-LINK-01`. Set a real `MONO_TOKEN`, run the built `jarsplit`
binary against a real plan file, open one live `https://send.monobank.ua
/jar/{sendId}?a=N` link, and confirm it prefills `N ₴` (not kopiykas) —
then flip `FR-LINK-01` from `accepted` to `shipped` in
`docs/product-requirements.md`. Once that's done, `jarsplit` is fully
`shipped` end to end with no further planned OpenSpec changes.
