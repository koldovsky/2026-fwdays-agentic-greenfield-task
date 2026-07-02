# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-02T10:05:00+00:00** — Archived the `add-link-generation`
OpenSpec change: synced its delta spec into a new main spec at
`openspec/specs/link-generation/spec.md` (3 requirements — link
construction, no-token/extra-data guarantee, deterministic order — added
verbatim, verified byte-identical, validated with `openspec validate
link-generation --strict`), then moved the change folder to
`openspec/changes/archive/2026-07-02-add-link-generation/`. The
`link-generation` capability (`internal/linkgen`) covers FR-LINK-01 and
NFR-SEC-04 and is implemented/tested (see prior action). Archived
**with 3 known-incomplete tasks** (4.1–4.3, the manual V-1 gate) — this
was an explicit user decision, not an oversight: `FR-LINK-01` remains
`accepted` (not `shipped`) in `docs/product-requirements.md` until someone
runs a real `MONO_TOKEN` through the pipeline, opens one live
`?a=N` link, and confirms it prefills `N ₴` (not kopiykas). `openspec
list` now shows no active changes.

## Next step

Before relying on `jarsplit` for a real transfer, close V-1 by hand (set
`MONO_TOKEN`, generate one live link, open it, confirm `N ₴`, then flip
FR-LINK-01 to `shipped`). Independently of that, start `add-output-reporting`
— the Phase 4 capability in
[openspec-capability-plan.md](openspec-capability-plan.md), which consumes
`link-generation`'s `[]Link` and `jar-matching`'s skip `[]Warning`s to
render the stdout table/totals and stderr warnings.
