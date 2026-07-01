# Vouch — agent context

Base rules and docs index:
@AGENTS.md

Always-loaded project context (read every session):

- Live handoff — what happened last, next steps, blockers:
@docs/current-state.md

- Architecture (Feature-Sliced Design + tailoring pipeline):
@docs/system-design.md

## Load on demand

Do not load these every session — read them only when the task matches:

- **UI / styling task** → read [`docs/DESIGN.md`](docs/DESIGN.md) (brand rules + how tokens/fonts are wired). Full system in `docs/vouch-design-system/`.
- **Writing specs or new feature docs** → read [`docs/cv-agent-requirements.md`](docs/cv-agent-requirements.md) (PRD, cite IDs) and [`docs/cv-agent-product-brief.md`](docs/cv-agent-product-brief.md) (narrative).
