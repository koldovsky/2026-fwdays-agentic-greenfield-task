# project-docs-and-launch — tasks

## 1. Launch

- [x] 1.1 Create `corpus/` at repo root with 2–3 sample ГущоЛіт `.md` docs so `docker compose up` demos immediately
- [x] 1.2 `docker-compose.yaml`: app service `command: python -m askdocs.sync`, `./corpus:/corpus` mount, `ASKDOCS_CORPUS=/corpus`
- [x] 1.3 Add bounded wait-for-qdrant in `askdocs/sync.py` `main()` so `docker compose up` doesn't race the store on cold start

## 2. Docs

- [x] 2.1 Write `README.md`: what/why, ГущоЛіт domain, architecture (three interfaces), quick start (`docker compose up`), asking questions, running eval and tests — all in Docker
- [x] 2.2 Write `AGENTS.md`: OpenSpec workflow, accepted-only rule, Docker-only execution, interface boundaries, test command
- [x] 2.3 Add `CLAUDE.md` pointing to `AGENTS.md`

## 3. Verification

- [x] 3.1 `docker compose up -d`, confirm logs show the corpus indexed, run `docker compose run --rm app python -m askdocs.cli "<corpus question>"` → cited answer; `docker compose down`
- [x] 3.2 Full suite still green via `docker compose run --rm app pytest`
