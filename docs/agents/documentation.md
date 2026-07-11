# Documentation

Use the `document-bdd-feature` skill (installed at `.agents/document-bdd-feature/`) to record a video demonstration of each feature's BDD scenarios.

## Rules

1. **Document each feature once it passes the quality gate** — tests passing, implementation complete, code reviewed. Do not document features still in progress or with failing tests.
2. **Output directory:** `docs/videos/` — pass this as the destination when running the skill.
3. **All features that pass the quality gate must be documented.** Every implemented feature needs a video demonstration linked to its BDD acceptance criteria.
