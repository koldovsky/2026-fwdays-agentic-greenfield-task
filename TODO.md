# TODO — priority backlog

> RULE: Single source of truth for what to do next. Agent reads this before picking work.
> Order = priority. Top item is next. Check `[x]` when done, do not delete — history is evidence.
> Format: `- [ ] **P0** short imperative — why / acceptance.` Priorities: P0 blocker, P1 must, P2 nice.
> Markdown, Obsidian + GitHub compatible. English, terse.

## Now

- [ ] **P0** Pick stack — pipeline cannot start without it. Then replace "Стан репозиторію" in `CLAUDE.md` with real build / lint / test commands.
- [ ] **P0** Bootstrap OpenSpec — create `openspec/` skeleton. Spec must exist before any implementation (see AGENTS.md "Spec-driven development").
- [ ] **P1** Move term-extraction rules from `README.md` (items 5–8) into a real spec: article structure, glossary card format, cross-links, uk-Wikipedia links.
- [ ] **P1** Add a sample transcript to `input/transcripts/` — no test material yet, nothing to run the pipeline on.

## Later

- [ ] **P2** Mirror the "read AGENTS.md" pointer into other IDE rule files (`.cursor/`, `.windsurf/`, `.clinerules/`, `.opencode/`, `.github/copilot-instructions.md`) — none of them exist yet, `CLAUDE.md` used to claim they did.
- [ ] **P2** Define maker ≠ checker split: which subagent writes, which verifies. Graded criterion.
- [ ] **P2** Record the 1–2 min video demo, link it in the PR.
- [ ] **P2** Research why the caveman plugin ships `Boundaries: code/commits/PRs written normal` (from its `caveman-init` skill, not from CodeRabbit — `.coderabbit.yaml` says nothing about style). Hypothesis: compressing code would corrupt it, so the plugin fences it off. We already overrode commits and code comments to human-first prose; the **code** exception stays untouched until this is understood. Do not "optimize" it away.

## Done

<!-- move completed items here, newest on top -->
