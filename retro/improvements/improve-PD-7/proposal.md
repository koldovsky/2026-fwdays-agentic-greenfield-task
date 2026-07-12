# Improvement Proposal: improve-PD-7

- **Defect:** PD-7 (`docs/qa/process-defects.json`) — `gate-status.mjs`, the only aggregator carrying the RETROFIT banner, the committed-evidence boundary and three-valued NOT-EARNED semantics, is absent from CI. CI could render green while the local gate summary was red.
- **Class / severity:** missing-check / P1
- **Status:** approved

## Scope

**Changes:** `.github/workflows/ci.yml` gains

1. a `Gate self-tests` step in `verify` that executes the red→green proofs behind `improve-PD-3` and `improve-PD-9`;
2. a separate `gate-status` job that runs `node scripts/gate-status.mjs` and publishes its output to the job summary.

**Deliberately does NOT change:** any check script. No gate is weakened, and no `continue-on-error` is added.

## Target file

`.github/workflows/ci.yml` — **gate-bearing**. I first wrote here that it was not, without checking; `check-factory-integrity` immediately contradicted me:

```text
WARN [.github/workflows/ci.yml] gate-bearing drift (hash drift) is covered by an
approved improvement commit ("Refs: PD-<n>") — reseal with --init-lock inside
that improvement.
```

`factory-lock.json` locks all 25 gate-bearing files, and both `.github/workflows/*.yml` are among them — correctly, since CI *is* the gate nobody can skip. The lock is resealed inside this commit.

## Exact diff

```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ verify: after `Capability gates` @@
+      # The red->green proofs behind every improve-PD-* commit. A proof that
+      # never runs is a decorative check; these must stay executable forever.
+      - name: Gate self-tests
+        run: |
+          node tests/check-trajectory-retrofit.test.mjs
+          node tests/check-traceability-trace-ids.test.mjs

@@ new job @@
+  gate-status:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+        with: { fetch-depth: 0 }
+      - uses: actions/setup-node@v4
+        with: { node-version: 22, cache: npm }
+      - run: npm ci
+      - name: Gate status (three-valued; NOT-EARNED is red for G4+)
+        shell: bash
+        run: |
+          set -o pipefail
+          node scripts/gate-status.mjs | tee gate-status.txt
+      - name: Publish gate summary
+        if: always()
+        run: |
+          { echo '## Gate status'; echo; echo '```text'; cat gate-status.txt; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
```

## `set -o pipefail` is load-bearing

The first draft was `run: node scripts/gate-status.mjs | tee gate-status.txt`. GitHub Actions runs `run:` under `bash -e`, **not** `bash -eo pipefail`. `tee` exits 0, so the job would have rendered **green over a failing gate summary** — the exact vacuous pass this job exists to expose. Measured:

```text
  piped, no pipefail: exit=0
  piped, pipefail   : exit=1
```

The check that hunts laundering nearly shipped as a laundering channel. Recorded, not silently patched.

## This job is EXPECTED to be red

`gate-status` exits 1 today. That is the correct, honest reading of the evidence base:

```text
  traceability         PASS           Scope: 34
  trajectory           NOT-EARNED     Scope: 10
  recordings           NOT-EARNED     Scope: 0
  coverage             NOT-EARNED     Scope: 0
  evals                NOT-EARNED     Scope: 0
  acceptanceExistence  NOT-EARNED     Scope: 0
  acceptanceArtifact   NOT-EARNED     Scope: 0
  visual               NOT-EARNED     Scope: 0
  integrity            PASS           Scope: 25
  traceabilityRelease  FAIL
  trajectoryRelease    NOT-EARNED     Scope: 10

⚠ RETROFIT MODE: 10 slice(s) ... RETROFITTED, not earned red-first
Result: FAIL
```

It goes green by **earning** the evidence (annotate the 34 MVP FRs → G3 acceptance tags → G5 coverage → G6 recordings + evals), never by weakening a check.

**Operational note, not a code change:** keep `gate-status` **out of the required-checks list** in branch protection until G6. A visible red job is honest; a suppressed one is not. `verify` remains the blocking job.

**Known consequence of `improve-PD-3`:** the `verify` job's `Trajectory process audit` step runs `check-trajectory.mjs --release` on `main`, which now exits 1 (NOT-EARNED). **CI on `main` is therefore red until the first slice is earned red-first.** This proposal does not paper over that. The two legitimate exits are (a) earn a slice through the full G4 loop, or (b) file a waiver under `docs/qa/waivers/` with an owner-signed row in `RULES-CHANGELOG.md`. Silently dropping `--release` from CI would be weakening a gate, which the playbook forbids.

## Expected metric movement

- **Metric:** number of gate-bearing aggregators invoked by CI.
- **Current:** 0 (`gate-status` never ran in CI).
- **Expected after fix:** 1, and its verdict is visible on every push and PR.
- **Secondary:** the two red→green proofs move from "committed once" to "executed on every CI run".

## EXECUTED proof

```text
=== does tee mask a non-zero exit without pipefail? ===
  without pipefail: exit=0
  with    pipefail: exit=1

=== with the real script ===
  piped, no pipefail: exit=0
  piped, pipefail   : exit=1

=== YAML ===
  YAML valid. jobs: ['verify', 'gate-status']
  verify has Gate self-tests? True
  parsed keys contain continue-on-error: False   (the string appears only in a warning comment)

=== the self-tests CI will run ===
  tests/check-trajectory-retrofit.test.mjs  -> 7/7 checks passed
  tests/check-traceability-trace-ids.test.mjs -> 6/6 checks passed
```

## Rollback (one revert)

- **Single commit:** yes. `git revert <sha>` removes the job and the self-test step.
- **State to clean up on revert:** none.
- **Ladder position:** experimental. Promotion to a required check happens when it can pass — i.e. at G6 — and is a separate, owner-signed decision.

## Approval & trailer convention

- Human approver: Serhii · Date: 2026-07-10 (approved in-session: "PD-7 — gate-status у CI")
- Commit message ends with: `Refs: PD-7`
