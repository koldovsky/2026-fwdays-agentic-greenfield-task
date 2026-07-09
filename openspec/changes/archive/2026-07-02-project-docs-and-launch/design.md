# project-docs-and-launch — design

## Context

Final change. All six pipeline/quality capabilities are shipped and interface-clean. What's missing is the outward-facing layer: docs and a frictionless launch. This is mostly authoring plus a small compose change; the only runtime decision is what `docker compose up` should actually do.

## Goals / Non-Goals

**Goals:**

- `docker compose up` runs the whole system with zero manual steps (FR-052).
- README a newcomer can follow start-to-first-answer (FR-050).
- AGENTS.md/CLAUDE.md an agent can follow to contribute correctly (FR-051).

**Non-Goals:**

- Any behavior change to shipped capabilities.
- Publishing images, CI, or deployment docs beyond local `docker compose`.

## Decisions

### D1: `docker compose up` = qdrant + the sync watcher

The app service's default `command` is `python -m askdocs.sync`, watching a mounted `./corpus`. Rationale: "up the whole system with no manual steps" means the index must populate itself and stay current — exactly what sync does (FR-060). So `up` yields a running, self-refreshing system; the user then queries with `docker compose run --rm app python -m askdocs.cli "…"` (which overrides the default command, as does `pytest`). Alternative — `up` just starts idle services and the user ingests manually — rejected: that is a manual step FR-052 forbids.

### D2: A real `corpus/` at the repo root, separate from `tests/corpus`

`./corpus` is the user-facing mounted directory, seeded with a few sample ГущоЛіт docs so the first query works out of the box. It is deliberately separate from `tests/corpus`: the test fixture has specific content (a non-.md file, an oversized section) that tests assert on, and coupling runtime to fixtures would make either brittle. Duplicating a couple of small sample docs is normal sample-data practice.

### D3: Handle the qdrant cold-start race in sync main()

On `docker compose up`, app and qdrant start together; qdrant may not accept connections when sync constructs the store. sync `main()` gains a bounded wait-for-qdrant (poll the client until it responds or a timeout), mirroring the test conftest. Chosen over a compose healthcheck because the qdrant image lacks a shell/curl for a clean healthcheck command, and the wait belongs to the process that needs the dependency. This is a startup-robustness tweak, not a behavior change to the sync spec.

### D4: CLAUDE.md points to AGENTS.md

AGENTS.md is the single source of truth; CLAUDE.md is a thin pointer to it, so both conventional agent entrypoints resolve to the same content without duplication that can drift.

## Risks / Trade-offs

- [`corpus/` and `tests/corpus` drift] → intentional separation (D2); they serve different roles and are reviewed independently.
- [Docs describe commands that could rot as the project evolves] → commands are the same ones the test suite and entrypoints use, so drift surfaces quickly in normal use.
- [Bounded wait could time out on a very slow cold start] → generous timeout with a clear error; re-running `up` recovers.

## Open Questions

- None blocking.
