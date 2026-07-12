# Process improvements (`improve-PD-<n>`)

Each folder is an approved fix to a **gate-bearing script**, landed as a single
commit carrying `Refs: PD-<n>`, with an EXECUTED red→green proof pasted into its
`proposal.md`.

## Why they do not live in `openspec/changes/`

The Project Factory template (`templates/retro/improvement.template.md`) says to
put them there. That breaks `npx openspec validate --all --strict` — a command
the factory itself wires into G4 and G7:

```
✗ change/improve-PD-12
  [ERROR] Change must have at least one delta. No deltas found.
```

An improvement changes a **check script**, not a capability. It has no spec
delta and cannot have one. The tempting fix — an empty `specs/` folder with a
stub requirement — would be a fictional spec existing only to silence a
validator. That is laundering.

Filed as **PD-13**. Until the template is corrected upstream, improvements live
here. `scripts/` and `.claude/workflows/` have no machine dependency on the old
path; only `.claude/agents/process-auditor.md` mentions it in prose.

## Index

| Folder | Defect | Landed |
| --- | --- | --- |
| `improve-PD-3` | retrofit slices laundered `check-trajectory --release` | `3d5efd1` |
| `improve-PD-7` | CI never invoked `gate-status.mjs` | `f829e01` |
| `improve-PD-9` | `@trace` regex could not match categorized ids | `ce7d62d` |
| `improve-PD-12` | `@trace` matched prose; a disclaimer became evidence | `988ce25` |
