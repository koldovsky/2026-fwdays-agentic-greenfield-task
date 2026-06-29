# Requirements — tf-guard

Last updated: 2026-06-29

This document is the **single source of truth** for what `tf-guard` does and what
constraints govern it. Every requirement has a stable ID. Specs, tests, and the eval
dataset reference these IDs to keep traceability intact. Narrative context lives in
[product-brief.md](product-brief.md).

## ID conventions

| Prefix   | Meaning                  | Example                                        |
| -------- | ------------------------ | ---------------------------------------------- |
| `FR-*`   | Functional Requirement   | `FR-SCORE-01` — score each resource change     |
| `NFR-*`  | Non-Functional           | `NFR-OFFLINE-01` — runs with zero credentials  |
| `TC-*`   | Technical Constraint     | `TC-STACK-01` — TypeScript strict, Node ≥ 20   |
| `BC-*`   | Business / UX Constraint | `BC-EXIT-01` — non-zero exit on high risk      |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Input

- **FR-PARSE-01** (shipped): Read a `terraform plan -json` document from a file path
  or stdin and extract the list of resource changes (`resource_changes[]`).
- **FR-PARSE-02** (shipped): Reject malformed input with a clear, non-crashing error
  (validated via `zod` at the boundary).

### Policy rules

- **FR-TAGS-01** (shipped): Flag any *created*, *updated*, or *replaced* resource that
  is missing one of the required tag keys (default: `owner`, `environment`). Replace
  is included because it re-creates the resource, so tags must be present.
- **FR-RISK-01** (shipped): Flag any `delete` or `replace` action on a stateful
  resource type (e.g. `*_database`, `*_bucket`, `*_disk`, `*_instance`). A denylist
  excludes config/attachment lookalikes that merely contain a stateful substring
  (e.g. `aws_s3_bucket_public_access_block`, `aws_iam_instance_profile`).

### Scoring (the capability)

- **FR-SCORE-01** (shipped): Compute a deterministic risk score `0..100` per resource
  change from its action and matched rules. Pure, total function. An unrecognized
  action is treated as risky (weight 40), never as zero.
- **FR-SCORE-02** (shipped): Rank findings by score descending; ties broken by
  resource address (stable, alphabetical).

### Output

- **FR-OUT-01** (shipped): Emit a human-readable ranked summary (text) and, with
  `--json`, a machine-readable report.
- **FR-OUT-02** (shipped): Summary lines are concise (≤ 100 chars) and never claim a
  resource is "safe" when its score is above the high-risk threshold.

## Non-functional

- **NFR-OFFLINE-01**: No network, no credentials, no paid APIs. Runs in CI as-is.
- **NFR-DETERMINISTIC-01**: Same input → identical output (no clock/random in core).
- **NFR-PERF-01**: Process a 1k-resource plan in < 500 ms on a laptop.

## Technical constraints

- **TC-STACK-01**: TypeScript strict, Node ≥ 20, ESM. Pure core in `src/lib/`.
- **TC-DEPS-01**: Only runtime dependency is `zod`.

## Business / UX constraints

- **BC-EXIT-01**: Exit code `1` when any finding is at/above the high-risk threshold
  (so CI can gate on it); `0` otherwise.
- **BC-PRIVACY-01**: Never persist or transmit plan contents anywhere.
