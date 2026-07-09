# project-docs-and-launch — proposal

## Why

The system is complete — ingest, retrieve, answer, cli, eval, sync all shipped — but a newcomer (human or agent) has no map: no README explaining what askdocs is or how to run it, no agent guide, and no one-command launch. PRD FR-050, FR-051, FR-052 close that gap so the project is usable and contributable without reading the source.

## What Changes

- **README.md** (FR-050): what askdocs is and why it exists, the ГущоЛіт domain, architecture (the three interfaces), and a quick start — `docker compose up`, editing the corpus, asking questions, running eval and tests. All commands run in Docker.
- **AGENTS.md** + **CLAUDE.md** (FR-051): guide for agents working in this repo — the OpenSpec propose→apply→sync→archive workflow, the "implement only `accepted`, never touch `proposed`" rule, docker-only execution, the interface boundaries, and the test command. `CLAUDE.md` points to `AGENTS.md` so both entrypoints resolve to one source of truth.
- **One-command launch** (FR-052): `docker compose up` brings up the whole system with no manual steps — qdrant plus the app running the sync watcher over a mounted `./corpus`, so the index self-populates and stays fresh. A starter `corpus/` with sample ГущоЛіт docs makes the first query work immediately.

## Capabilities

### New Capabilities

- `project-docs`: README + agent guide + one-command launch. Covers PRD FR-050, FR-051, FR-052.

### Modified Capabilities

<!-- none: no behavior change to shipped capabilities; compose gains a default command and a corpus mount -->

## Impact

- New files: `README.md`, `AGENTS.md`, `CLAUDE.md`, `corpus/` (sample docs).
- `docker-compose.yaml`: app service gains `command: python -m askdocs.sync`, a `./corpus:/corpus` mount, and `ASKDOCS_CORPUS=/corpus`; qdrant readiness handled so `up` works on a cold start.
- No code behavior changes to shipped capabilities; sync main() gains a bounded wait for qdrant so `up` doesn't race.
- Verification: `docker compose up` indexes the sample corpus and a CLI query returns a cited answer.
