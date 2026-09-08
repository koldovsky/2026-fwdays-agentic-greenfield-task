# OpenSpec - the spec-contract layer

OpenSpec is this repo's machine-validated spec-contract layer. It holds the detailed contract for
each capability as GIVEN/WHEN/THEN scenarios and is enforced by `openspec validate --all --strict`.
It runs **alongside** the deterministic Python harness in [`scripts/`](../scripts/), not instead of
it: the Python gates own requirement -> spec -> `@trace` traceability and the git-visible process
trail; OpenSpec owns the proposal/design/tasks + scenario contract.

- **Tool:** `@fission-ai/openspec` (CLI `openspec`), pinned in the repo-root
  [`package.json`](../package.json).
- **Install:** `npm ci` at the repo root (installs the pinned version under `node_modules/`, isolated
  from the Python backend). First-time bootstrap used `npm install --save-dev @fission-ai/openspec@1.5.0`.
- **Version:** 1.5.0 (`npx openspec --version`). Schema: `spec-driven` (see `config.yaml`).
- **Validate:** `npm run spec:validate` (= `openspec validate --all --strict`), or
  `python scripts/check-openspec` (cross-platform wrapper used by the gates).

## Layout

```
openspec/
  config.yaml                 # schema + project context
  specs/<capability>/spec.md  # current, applied contract (source of truth for what IS built)
  changes/                    # in-flight change proposals (empty when nothing is in flight)
  changes/archive/            # completed changes, dated (e.g. 2026-07-10-add-auth-email)
```

- `specs/auth/spec.md` is the applied auth contract (built by slice 001).
- `changes/archive/2026-07-10-add-auth-email/` is the completed change that produced it.

## Decision - specs <-> traceability bridge (Option A)

The Python harness `scripts/check-traceability` discovers slices by walking
`docs/specs/NNN-*.md`, reading each file's **Requirements covered** / **Out of scope** sections, and
mapping those FR/NFR ids to `@trace <ID>` test docstrings. Introducing OpenSpec must not break that
chain.

**We keep `docs/specs/NNN-*.md` as the harness anchor and let OpenSpec hold the detailed contract
(Option A).** Each `docs/specs/NNN-*.md` stays a small pointer file - problem statement, the
`Requirements covered` ids, and a link to the OpenSpec change - so `_harness.py` and
`check-traceability` run **completely unchanged**. The alternative (Option B: teach the Python parser
to also read `openspec/`) was rejected as higher-risk mid-build: it would change gate logic that is
already green and proven on slice 001, for no traceability benefit (the FR ids live in both places).

Consequences:

- `check-traceability --check-fresh` and `check-trajectory` are unaffected; the committed
  `docs/qa/*.md` matrices stay a pure function of `docs/requirements.md` + `docs/specs/` + tests.
- OpenSpec cites the same stable FR/NFR ids inside each requirement name, so a reader can pivot from
  a scenario to `docs/requirements.md` and to the `@trace` test without a second id scheme.
- The two layers are decoupled: `openspec/` is invisible to the Python parser, and the Python
  matrices are invisible to OpenSpec.

## Per-slice flow (slices 002+)

Unlike slice 001 (recorded **retroactively** - built before OpenSpec existed), every later slice
starts as an OpenSpec change **before any code**:

1. **Propose.** `openspec new change <kebab-name>` then write `proposal.md` (Why / What Changes /
   Capabilities / Impact).
2. **Specify.** Add `specs/<capability>/spec.md` deltas: `## ADDED/MODIFIED/REMOVED Requirements`,
   each `### Requirement:` in SHALL form and **naming its FR/NFR id**, each with at least one
   `#### Scenario:` in GIVEN/WHEN/THEN form. Scenarios need exactly four `#` - three fails silently.
3. **Design + plan.** Add `design.md` (context, decisions, risks) and `tasks.md` (the checklist).
4. **Ratify.** The owner reviews and approves the proposal (the OpenSpec analogue of the
   `brainstorming` hard gate). `openspec validate <change> --strict` must pass.
5. **Anchor.** Add the thin `docs/specs/NNN-*.md` pointer (problem + `Requirements covered` ids +
   link to the change) so the Python traceability harness picks the slice up.
6. **Implement.** Build to the contract, driving `scripts/verify.*`; add `@trace <ID>` docstrings to
   the covering tests so `check-traceability` goes from GAP to COVERED.
7. **Archive on done.** After the Judge marks the slice done, `openspec archive <change>` moves it to
   `changes/archive/` and applies the deltas into `specs/<capability>/spec.md`.

## Where it is enforced

- **CI:** the `harness` job runs `python scripts/check-openspec --require` (installs via `npm ci`),
  alongside the traceability/trajectory/eval gates - see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- **pre-commit:** `scripts/pre-commit-run` runs `openspec validate --all --strict` when a commit
  touches `openspec/` (it skips gracefully if Node is absent, so it never hard-blocks a commit).

`openspec validate` is the OpenSpec-side gate; it does not replace the Definition of Done in
[`AGENTS.md`](../AGENTS.md) (verify green + independent Checker + Judge + CodeRabbit).
