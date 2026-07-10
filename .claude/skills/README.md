# Skills — canonical store, provenance & security audit log

Agent skills are procedural instructions an agent may load; some also run CLIs/scripts, so each
is treated as a **trust decision** and recorded below.

## Location (cross-agent)

Skills are **canonical in `.agents/skills/`** (vendor-neutral) and mirrored into each agent's own
skills directory. Today that means Claude Code's `.claude/skills/`.

- **Edit skills here** (`.agents/skills/`), then propagate with the sync script:
  - `powershell -File scripts/sync-skills.ps1`  ·  `bash scripts/sync-skills.sh`
- Other agents (Cursor, Codex, Copilot, …): point them at `.agents/skills/`, or extend the sync
  script to copy into their skills directory.

## Policy

1. Prefer official (Anthropic, Vercel Labs) or clearly reputable, high-install skills.
2. Record each skill's audit status (Gen Agent Trust Hub / Socket / Snyk). Target: all **Pass**.
3. Install third-party skills by **vetted manual copy** (read it, then commit it) — not by piping
   an unaudited CLI, so nothing untrusted executes at install time.
4. Never store secrets in a skill; they are committed and public.

## Installed skills

| Skill | Source | Popularity | Trust Hub | Socket | Snyk | How installed |
| --- | --- | --- | --- | --- | --- | --- |
| `brainstorming` | Authored here (inspired by [obra/superpowers](https://github.com/obra/superpowers)) | — | n/a | n/a | n/a | Written locally |
| `grill-me` | [mattpocock/skills](https://github.com/mattpocock/skills) | 490K · 161k★ | ✅ Pass | ✅ Pass | ✅ Pass | Vetted copy |
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) — dependency of `grill-me` | 490K · 161k★ | ✅ Pass | ✅ Pass | ✅ Pass | Vetted copy |
| `python-fastapi` | Authored here | — | n/a | n/a | n/a | Written locally |
| `find-skills` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | 2.4M · 25.5k★ | ✅ Pass | ✅ Pass | ⚠️ **Warn** | Vetted copy |

### When to use them

- **`brainstorming`** — before any new feature/change: idea → approved spec in `docs/specs/`
  (hard gate — no code until the design is approved), then hand off to the Maker.
- **`grill-me`** (→ `grilling`) — stress-test a plan/spec with a relentless, one-question-at-a-time
  interview before building.
- **`find-skills`** — discover/install more skills from the ecosystem (see caveat).
- **`python-fastapi`** — backend coding conventions (loaded while writing backend code).

### Notes on trust

- **`find-skills` (Snyk: Warn)** — does not fully meet the all-pass bar; its purpose is to run the
  `npx skills` CLI, which is what Snyk flags. Committed as inert text; using it is a separate,
  explicit action. Delete `find-skills/` for strict compliance — nothing depends on it.
- **`brainstorming`** — the upstream
  [superpowers `brainstorming`](https://www.skills.sh/obra/superpowers/brainstorming) passes all
  three audits (267K installs) but ships executable `scripts/` and is coupled to its framework
  (a `writing-plans` skill, its own docs path). We authored a self-contained equivalent instead,
  fitted to this repo's `docs/specs/` + Maker/Checker/Judge flow. Want the full framework?
  `npx skills add obra/superpowers`.

## Already available without installation

Official Anthropic **`/security-review`** and **`/code-review`** ship with Claude Code — covering
the "security audit" + maker≠checker review needs with zero third-party trust.
