---
name: spec-driven-change
description: Drive a change to jarsplit spec-first — update the spec/requirements and get them reviewed BEFORE writing code, using the repo's OpenSpec workflow with one human review gate at the spec. Use when asked to change behavior, add a feature, or modify a requirement (grammar, validation, output, matching, links), or when the user says "spec-first", "spec-driven", or "follow the process".
user-invocable: true
license: MIT
compatibility: Requires the openspec CLI and this repo's docs/ + openspec/ layout.
metadata:
  author: jarsplit
  version: "1.0"
---

# Spec-driven change

Codifies the workflow for changing `jarsplit`: decide and review the **contract**
before touching code. The single load-bearing rule is the **human gate at the
spec** — everything mechanical is automated, but implementation never starts until
a human has reviewed (ideally grilled) the spec.

## Why this shape

Automation is not what separates agentic engineering from vibe coding — a reviewable
artifact plus a human gate is. This is a money-routing tool (`BC-SAFE-01`: never
silently misroute money), so the parsing/matching/link contract must be decided and
reviewed before code. Skipping or collapsing the gate — approving spec and code
together at the end — is the thing that turns this into vibe coding. Keep the gate.

## The two spec layers in this repo

- **`docs/product-requirements.md`** — the declared single source of truth, with
  stable requirement IDs (`FR-*`, `NFR-*`, `TC-*`, `BC-*`). These IDs are the
  traceability anchor: specs, tests, and PRs cite them. Settle IDs first.
- **OpenSpec** (`openspec/`) — change-driven specs. `openspec/specs/` holds the live
  capability specs; `openspec/changes/` holds proposals; `openspec/changes/archive/`
  is history. Driven by the `openspec-propose` / `openspec-apply-change` /
  `openspec-archive-change` skills (a.k.a. `opsx:*`).

Keep both in sync: the OpenSpec delta is the mechanism; the PRD is the human intent
the delta cites.

## Process — run in this order

### 0. Understand + decide (before proposing)
- Explore the affected code and every artifact that encodes the current contract
  (parser, tests, `openspec/specs/`, the relevant `FR-*` rows). Reuse the existing
  patterns; don't invent new structure.
- Surface **genuine decisions** to the user with `AskUserQuestion` — especially any
  ambiguity that could misroute money or silently change validation. Do not guess on
  safety-relevant forks. (Example from the plan-syntax change: does `12 000` with an
  internal space parse or stay malformed?)

### 1. Propose (automated)
Run the `openspec-propose` skill (`/opsx:propose`) to create
`openspec/changes/<kebab-name>/` with:
- `proposal.md` — why + what; mark breaking changes **BREAKING**.
- `design.md` — decisions with rationale and rejected alternatives; risks/trade-offs.
- delta `specs/<capability>/spec.md` — use `## MODIFIED Requirements` (or ADDED /
  REMOVED / RENAMED). **MODIFIED must copy the ENTIRE requirement block** from
  `openspec/specs/<capability>/spec.md`, then edit — partial content loses detail at
  archive. Every requirement needs ≥1 `#### Scenario:` (exactly four `#`).
- `tasks.md` — the code/test/doc checklist.
Then `openspec validate <name>`.

### 2. Sync the PRD + brief (automated)
Edit `docs/product-requirements.md` (the cited `FR-*` rows) and any narrative example
in `docs/product-brief.md` so the source-of-truth prose agrees with the delta spec.
Do this alongside the proposal so IDs and prose never disagree.

### 3. ⛔ HUMAN GATE — grill the spec (STOP)
Stop here. Present the contract for review and offer the `grill-me` skill to
interrogate it adversarially. Actively list the edge cases you want attacked (odd
names, whitespace, replaced grammar, ambiguous matches). **Nothing below runs until
the human approves.** This is the maker ≠ checker gate from the PRD's verification
section.

--- everything below runs automatically after approval ---

### 4. Apply (automated)
Run the `openspec-apply-change` skill (`/opsx:apply`) to implement the `tasks.md`
list: code + tests to green. Keep changes localized; downstream stages that only read
shared structs usually need no change. Follow `golang-code-style`. Obey `TC-DEP-01`
(stdlib + an approved CLI lib only) and the `NFR-SEC-*` token rules.

### 5. Verify behaviorally (automated) — not just "tests pass"
- `go test ./...` green.
- Actually **run the binary** end-to-end offline via the fixture override
  (`MONO_CLIENT_INFO_FILE=…`, per `NFR-TEST-01`) against a sample plan, and confirm
  the new behavior and the exit-code contract (`FR-EXIT-01`: 0 / 1 / 2). Cite the
  requirement IDs you verified.

### 6. Derived artifacts + status (automated)
- Update sample inputs (`sample-input.txt`) to the new contract.
- Flag any gitignored real plans that the change would break.
- Update `docs/current-state.md` with what changed and an **ISO-8601 timestamp**
  (required by `AGENTS.md`).

### 7. Archive (automated)
Run the `openspec-archive-change` skill (`/opsx:archive`) to sync the delta into the
live `openspec/specs/`, so the live spec stays authoritative.

## Guardrails
- **Never skip or collapse the step-3 gate**, even under time pressure.
- Requirement IDs are the anchor — change the `FR-*` text before code, and cite IDs
  in specs, tests, commits, and verification.
- Surface safety-relevant decisions (anything that could misroute money or change
  validation) to the user; never guess.
- Leave `openspec/changes/archive/**` untouched (history).
- Don't confuse the output URL param `?a=` with the input grammar — unrelated.
