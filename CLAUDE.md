# CLAUDE.md

Read **@AGENTS.md** — it is the single source of truth for this repo (setup, the Verify
commands, the maker/checker/judge roles, reporting rules, and the Definition of Done).
This file is a pointer, not a second copy; don't duplicate rules here.

Non-negotiables:

- **Verify before "done":** `powershell -File scripts/verify.ps1` (or `bash scripts/verify.sh`).
- **Spec first:** add/update a [`docs/specs/`](docs/specs/) entry before implementing.
- **Maker ≠ checker ≠ judge:** run `/code-review` + `/security-review` as a separate pass; only the Judge marks a task complete.
- **Never commit secrets;** skills are a trust boundary ([`.claude/skills/README.md`](.claude/skills/README.md)).
